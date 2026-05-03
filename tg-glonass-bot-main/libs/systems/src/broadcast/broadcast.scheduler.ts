import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PostType, PostDTO, UserDTO, User } from '@domains';
import { AbstractPostScheduler, ChannelJobData } from "../forwarding-message";
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class BroadcastScheduler extends AbstractPostScheduler {
    protected readonly typePost = PostType.TG;

    constructor(
        protected readonly config: ConfigService,
        @InjectQueue('broadcast') protected readonly queue: Queue
    ) {
        super(config);
    }

    protected filterUsersForPost(users: User[], post: PostDTO): User[] {
        if ([PostType.TG, PostType.TG2, PostType.TG3].includes(post.type)) {
            return users.filter(u => u.tgId);
        }
        return []; 
    }

    protected prepareJobData(post: PostDTO, users: UserDTO[]): ChannelJobData {
        return {
            users,
            text: post.text,
            media: post.media,
            date: post.date,
            type: post.type,
        };
    }

    async removePostFromQueue(postId: string) {
        const repeatableJobs = await this.queue.getRepeatableJobs();
        const job = repeatableJobs.find(j => j.id === postId);

        if (job) {
            await this.queue.removeRepeatableByKey(job.key);
            this.logger.log(`[Queue] 🗑️ TG задача ${postId} удалена из повторов`);
        }
        
        const normalJob = await this.queue.getJob(postId);
        if (normalJob) {
            await normalJob.remove();
        }
    }

    @Cron(CronExpression.EVERY_MINUTE) 
    async syncPosts() {
        const tgTypes = [PostType.TG, PostType.TG2, PostType.TG3];
        
        const currentRepeatableJobs = await this.queue.getRepeatableJobs();
        const queuedPostIds = currentRepeatableJobs
            .map(j => j.id)
            .filter((id): id is string => !!id);

        let allActiveIds: string[] = [];

        for (const type of tgTypes) {
            try {
                const response = await axios.get(`${this.config.get<string>('GATE_URL')}/posts`, {
                    params: { page: 1, limit: 9999, type }
                });
                const items = response.data.items as PostDTO[] || [];
                const activePosts = items.filter(p => p.active);
                
                allActiveIds.push(...activePosts.map(p => p.id));

                for (const post of activePosts) {
                    await this.schedulePost(post);
                }
            } catch (e) {
                this.logger.error(`Sync error for ${type}: ${e.message}`);
            }
        }

        for (const queuedId of queuedPostIds) {
            if (!allActiveIds.includes(queuedId)) {
                await this.removePostFromQueue(queuedId);
            }
        }
    }
}