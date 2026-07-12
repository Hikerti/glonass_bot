import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostDTO, UserDTO, UserRole, User, PostType } from '@domains';
import { parseInterval } from '@shared';
import { Queue } from 'bull';
import axios from 'axios';

export interface ChannelJobData {
    [key: string]: any;
    users: UserDTO[];
    text: string;
    media: string[];
    attachments?: string[];
    subject?: string;
    date: string;
    startDate?: string | null;
    type: PostType;
    targetUserIds?: string[];
}

@Injectable()
export abstract class AbstractPostScheduler implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly queue: Queue;
  protected abstract readonly typePost: PostType;

  constructor(protected readonly config: ConfigService) {}

  async onModuleInit() {
    await this.syncPosts();
  }

  private parseScheduleDate(dateStr: string, boundary: 'start' | 'end'): number | null {
    const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const legacyDate = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    const match = isoDate || legacyDate;

    if (!match) {
      return null;
    }

    const [year, month, day] = isoDate
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : [Number(match[3]), Number(match[2]), Number(match[1])];
    const scheduleDate = boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);

    if (
      scheduleDate.getFullYear() !== year ||
      scheduleDate.getMonth() !== month - 1 ||
      scheduleDate.getDate() !== day
    ) {
      return null;
    }

    return scheduleDate.getTime();
  }

  private parseExpiryDate(dateStr: string): number | null {
    return this.parseScheduleDate(dateStr, 'end');
  }

  private parseStartDate(dateStr?: string | null): number {
    return dateStr ? this.parseScheduleDate(dateStr, 'start') ?? NaN : 0;
  }

  protected abstract prepareJobData(
    post: PostDTO,
    users: UserDTO[],
  ): ChannelJobData;
  protected abstract filterUsersForPost(users: User[], post: PostDTO): User[];

  protected shouldRunImmediatelyOnFirstSchedule(_post: PostDTO): boolean {
    return false;
  }

  protected getImmediateJobId(postId: string): string {
    return `${postId}:immediate`;
  }

  protected getQueueForPost(_post: PostDTO): Queue {
    return this.queue;
  }

  private getGateUrl() {
    const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
    const localPort = this.config.get<string>('GATE_HTTP_PORT') || '3000';
    const gateUrl =
      this.config.get<string>('GATE_URL') ||
      (isDocker ? 'http://gate:3000' : `http://localhost:${localPort}`);

    if (!isDocker && gateUrl.includes('://gate')) {
      return `http://localhost:${localPort}`;
    }

    return gateUrl;
  }

  async syncPosts() {
    try {
      const response = await axios.get(`${this.getGateUrl()}/posts`, {
        params: { page: 1, limit: 9999, type: this.typePost },
      });
      const dbPosts: PostDTO[] = response.data.items || [];
      const activeDbPosts = dbPosts.filter((p) => p.active);

      for (const post of activeDbPosts) {
        await this.schedulePost(post);
      }
    } catch (e) {
      this.logger.error(`[Sync] API Error: ${e.message}`);
    }
  }

  async schedulePost(post: PostDTO) {
    try {
      const expiryDate = this.parseExpiryDate(post.date);
      const startDate = this.parseStartDate(post.startDate);
      const now = Date.now();

      if (expiryDate === null) {
        await this.removePostFromQueue(post.id);
        this.logger.warn(`[Schedule] Post ${post.id} has invalid end date: ${post.date}`);
        return;
      }

      if (Number.isNaN(startDate)) {
        await this.removePostFromQueue(post.id);
        this.logger.warn(`[Schedule] Post ${post.id} has invalid start date: ${post.startDate}`);
        return;
      }

      if (startDate > expiryDate) {
        await this.removePostFromQueue(post.id);
        this.logger.warn(`[Schedule] Post ${post.id} has start date after end date`);
        return;
      }

      if (now > expiryDate) {
        await this.removePostFromQueue(post.id);
        return;
      }

      const res = await axios.get(`${this.getGateUrl()}/users`, {
        params: { page: 1, limit: 999999, role: UserRole.CLIENT },
      });

      const users = res.data.items || [];
      const filtered = this.filterUsersForPost(users, post);
      const jobData = this.prepareJobData(
        post,
        filtered.map(UserDTO.fromModel),
      );
      const queue = this.getQueueForPost(post);

      const intervalMs = parseInterval(post.interval);
      const repeatableJobs =
        intervalMs > 0 ? await queue.getRepeatableJobs() : [];
      const hasRepeatableJob = repeatableJobs.some((j) => j.id === post.id);
      const immediateJob = await queue.getJob(this.getImmediateJobId(post.id));
      const shouldRunInitialJob =
        intervalMs > 0 &&
        !immediateJob &&
        this.shouldRunImmediatelyOnFirstSchedule(post);

      if (
        shouldRunInitialJob &&
        !hasRepeatableJob &&
        now >= startDate
      ) {
        await queue.add(jobData, {
          jobId: this.getImmediateJobId(post.id),
          removeOnComplete: true,
          removeOnFail: true,
        });

        this.logger.log(
          `[Schedule] рџљЂ РџРѕСЃС‚ ${post.id} РґРѕР±Р°РІР»РµРЅ РІ РѕС‡РµСЂРµРґСЊ ${this.queue.name} РґР»СЏ РЅРµРјРµРґР»РµРЅРЅРѕР№ РѕС‚РїСЂР°РІРєРё`,
        );
      }

      if (
        shouldRunInitialJob &&
        !hasRepeatableJob &&
        startDate > now
      ) {
        await queue.add(jobData, {
          jobId: this.getImmediateJobId(post.id),
          delay: startDate - now,
          removeOnComplete: true,
          removeOnFail: true,
        });

        this.logger.log(
          `[Schedule] рџљЂ РџРѕСЃС‚ ${post.id} РґРѕР±Р°РІР»РµРЅ РІ РѕС‡РµСЂРµРґСЊ ${this.queue.name} РґР»СЏ РѕС‚РїСЂР°РІРєРё РІ РґР°С‚Сѓ РЅР°С‡Р°Р»Р°`,
        );
      }

      const options: any = {
        jobId: post.id,
        removeOnComplete: true,
        removeOnFail: true,
      };

      if (intervalMs > 0) {
        options.repeat = {
          every: intervalMs,
          startDate: new Date(startDate || now),
          endDate: new Date(expiryDate),
        };
      }

      await queue.add(jobData, options);
      this.logger.log(
        `[Schedule] вњ… РџРѕСЃС‚ ${post.id} РґРѕР±Р°РІР»РµРЅ РІ РѕС‡РµСЂРµРґСЊ ${this.queue.name}`,
      );
    } catch (e) {
      this.logger.error(`[Schedule] Error ${post.id}: ${e.message}`);
    }
  }

  async removePostFromQueue(postId: string) {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.id === postId);

    if (job) {
      await this.queue.removeRepeatableByKey(job.key);
    } else {
      const normalJob = await this.queue.getJob(postId);
      if (normalJob) await normalJob.remove();
    }

    const immediateJob = await this.queue.getJob(
      this.getImmediateJobId(postId),
    );
    if (immediateJob) await immediateJob.remove();
  }
}
