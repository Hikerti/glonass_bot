import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PostType, PostDTO, UserDTO, User } from '@domains';
import { AbstractPostScheduler, ChannelJobData } from "../forwarding-message";
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class MailScheduler extends AbstractPostScheduler {
  protected readonly typePost = PostType.MAIL;
  protected shouldRunImmediatelyOnFirstSchedule(): boolean {
    return true;
  }

  constructor(
    protected readonly config: ConfigService,
    @InjectQueue('mail') protected readonly queue: Queue,
    @InjectQueue('mail-targeted') private readonly targetedQueue: Queue,
  ) {
    super(config);
  }

  protected getQueueForPost(post: PostDTO): Queue {
    return post.targetUserIds?.length ? this.targetedQueue : this.queue;
  }

  protected filterUsersForPost(users: any[], post: PostDTO): User[] {
    const targetIds = new Set(post.targetUserIds || []);

    return users.filter((user) => {
      const hasEmail = !!user.email;
      const rawUserType = user.typeEmail || user.type_email;

      if (!rawUserType) return false;

      const uType = String(rawUserType).toLowerCase().trim();
      const pType = String(post.type).toLowerCase().trim();

      if (!hasEmail || uType !== pType) return false;

      return targetIds.size === 0 || targetIds.has(user.id);
    });
  }

  protected prepareJobData(post: PostDTO, users: UserDTO[]): ChannelJobData {
    return {
      postId: post.id,
      users,
      text: post.text,
      media: post.media || [],
      attachments: post.attachments || [],
      date: post.date,
      startDate: post.startDate,
      type: post.type,
      targetUserIds: post.targetUserIds || [],
      subject: 'Р’Р°Р¶РЅРѕРµ СѓРІРµРґРѕРјР»РµРЅРёРµ',
    };
  }

  // РњРµС‚РѕРґ СѓРґР°Р»РµРЅРёСЏ, РєРѕС‚РѕСЂС‹Р№ РјС‹ РґРѕР±Р°РІР»СЏРµРј РґР»СЏ С„РёРєСЃР° РїСЂРѕР±Р»РµРјС‹ СЃ РѕС‡РµСЂРµРґСЊСЋ
  private async removeFromPrimaryQueue(postId: string) {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.id === postId);

    if (job) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    const normalJob = await this.queue.getJob(postId);
    if (normalJob && !(await normalJob.isActive())) {
      await normalJob.remove();
    }

    const immediateJob = await this.queue.getJob(
      this.getImmediateJobId(postId),
    );
    if (immediateJob && !(await immediateJob.isActive())) {
      await immediateJob.remove();
    }
  }

  private async removeFromTargetedQueue(postId: string) {
    const repeatableJobs = await this.targetedQueue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.id === postId);

    if (job) {
      await this.targetedQueue.removeRepeatableByKey(job.key);
    }

    const normalJob = await this.targetedQueue.getJob(postId);
    if (normalJob && !(await normalJob.isActive())) {
      await normalJob.remove();
    }

    const immediateJob = await this.targetedQueue.getJob(
      this.getImmediateJobId(postId),
    );
    if (immediateJob && !(await immediateJob.isActive())) {
      await immediateJob.remove();
    }
  }

  async schedulePost(post: PostDTO) {
    if (post.targetUserIds?.length) {
      await this.removeFromPrimaryQueue(post.id);
    } else {
      await this.removeFromTargetedQueue(post.id);
    }

    await super.schedulePost(post);
  }

  async removePostFromQueue(postId: string) {
    await this.removeFromTargetedQueue(postId);

    const repeatableJobs = await this.queue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.id === postId);

    if (job) {
      await this.queue.removeRepeatableByKey(job.key);
      this.logger.log(
        `[Queue] рџ—‘пёЏ Р—Р°РґР°С‡Р° РґР»СЏ РїРѕСЃС‚Р° ${postId} СѓРґР°Р»РµРЅР° РёР· РїРѕРІС‚РѕСЂРѕРІ`,
      );
    }

    const normalJob = await this.queue.getJob(postId);
    if (normalJob && !(await normalJob.isActive())) {
      await normalJob.remove();
      this.logger.log(`[Queue] рџ—‘пёЏ РћР±С‹С‡РЅР°СЏ Р·Р°РґР°С‡Р° РґР»СЏ РїРѕСЃС‚Р° ${postId} СѓРґР°Р»РµРЅР°`);
    }

    const immediateJob = await this.queue.getJob(
      this.getImmediateJobId(postId),
    );
    if (immediateJob && !(await immediateJob.isActive())) {
      await immediateJob.remove();
      this.logger.log(
        `[Queue] рџ—‘пёЏ РќРµРјРµРґР»РµРЅРЅР°СЏ Р·Р°РґР°С‡Р° РґР»СЏ РїРѕСЃС‚Р° ${postId} СѓРґР°Р»РµРЅР°`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncAllMailTypes() {
    const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
    const localPort = this.config.get<string>('GATE_HTTP_PORT') || '3000';
    const configuredGateUrl =
      this.config.get<string>('GATE_URL') ||
      (isDocker ? 'http://gate:3000' : `http://localhost:${localPort}`);
    const gateUrl =
      !isDocker && configuredGateUrl.includes('://gate')
        ? `http://localhost:${localPort}`
        : configuredGateUrl;
    const types = Object.values(PostType).filter((type): type is PostType =>
      String(type).startsWith('mail'),
    );

    const currentRepeatableJobs = [
      ...(await this.queue.getRepeatableJobs()),
      ...(await this.targetedQueue.getRepeatableJobs()),
    ];
    const queuedPostIds = currentRepeatableJobs
      .map((j) => j.id)
      .filter((id): id is string => !!id); // РЈР±РёСЂР°РµРј undefined РґР»СЏ TS

    const allActiveIds = new Set<string>();
    let allMailTypesLoaded = true;

    for (const type of types) {
      try {
        const response = await axios.get(`${gateUrl}/posts`, {
          params: { type, page: 1, limit: 9999 },
        });
        const dbPosts: PostDTO[] = response.data.items || [];

        const activeDbPosts = dbPosts.filter((p) => p.active);
        activeDbPosts.forEach((post) => allActiveIds.add(post.id));

        for (const post of activeDbPosts) {
          await this.schedulePost(post);
        }
      } catch (e) {
        allMailTypesLoaded = false;
        this.logger.error(`[Cron] РћС€РёР±РєР° С‚РёРїР° ${type}: ${e.message}`);
      }
    }

    if (!allMailTypesLoaded) {
      return;
    }

    for (const queuedId of queuedPostIds) {
      if (!allActiveIds.has(queuedId)) {
        await this.removePostFromQueue(queuedId);
      }
    }
  }
} 
