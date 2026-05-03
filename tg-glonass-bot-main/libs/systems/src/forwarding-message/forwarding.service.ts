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
    date: string;
    type: PostType;
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

    private parseExpiryDate(dateStr: string): number {
        try {
            const [day, month, year] = dateStr.split('.');
            return new Date(`${year}-${month}-${day}T23:59:59`).getTime();
        } catch {
            return 0;
        }
    }

    protected abstract prepareJobData(post: PostDTO, users: UserDTO[]): ChannelJobData;
    protected abstract filterUsersForPost(users: User[], post: PostDTO): User[];

    private getGateUrl() {
        const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
        const localPort = this.config.get<string>('GATE_HTTP_PORT') || '3000';
        const gateUrl = this.config.get<string>('GATE_URL') || (isDocker ? 'http://gate:3000' : `http://localhost:${localPort}`);

        if (!isDocker && gateUrl.includes('://gate')) {
            return `http://localhost:${localPort}`;
        }

        return gateUrl;
    }

    async syncPosts() {
        try {
            const response = await axios.get(`${this.getGateUrl()}/posts`, {
                params: { page: 1, limit: 9999, type: this.typePost }
            });
            const dbPosts: PostDTO[] = response.data.items || [];
            const activeDbPosts = dbPosts.filter(p => p.active);
            
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
            if (Date.now() > expiryDate) return;

            const res = await axios.get(`${this.getGateUrl()}/users`, {
                params: { page: 1, limit: 999999, role: UserRole.CLIENT }
            });

            const users = res.data.items || [];
            const filtered = this.filterUsersForPost(users, post);

            const intervalMs = parseInterval(post.interval);
            const options: any = {
                jobId: post.id,
                removeOnComplete: true,
                removeOnFail: true,
            };

            if (intervalMs > 0) {
                options.repeat = { every: intervalMs, endDate: new Date(expiryDate) };
            }

            await this.queue.add(this.prepareJobData(post, filtered.map(UserDTO.fromModel)), options);
            this.logger.log(`[Schedule] ✅ Пост ${post.id} добавлен в очередь ${this.queue.name}`);
        } catch (e) {
            this.logger.error(`[Schedule] Error ${post.id}: ${e.message}`);
        }
    }

    async removePostFromQueue(postId: string) {
        const repeatableJobs = await this.queue.getRepeatableJobs();
        const job = repeatableJobs.find(j => j.id === postId);
        if (job) {
            await this.queue.removeRepeatableByKey(job.key);
        } else {
            const normalJob = await this.queue.getJob(postId);
            if (normalJob) await normalJob.remove();
        }
    }
}
