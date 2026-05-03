import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PostType, PostDTO, UserDTO, User } from '@domains';
import { AbstractPostScheduler, ChannelJobData } from "../forwarding-message";
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class VkScheduler extends AbstractPostScheduler {
    protected readonly typePost = PostType.VK;

    constructor(
        protected readonly config: ConfigService,
        @InjectQueue('vk') protected readonly queue: Queue
    ) {
        super(config);
    }

    protected filterUsersForPost(users: User[], post: PostDTO): User[] {
        if (post.postToWall) {
            return users.length > 0 ? [users[0]] : []; 
        }
        return users.filter(u => u.vkId);
    }

    protected prepareJobData(post: PostDTO, users: UserDTO[]): ChannelJobData {
        return {
            users,
            text: post.text,
            media: post.media,
            date: post.date,
            type: post.type,
            postToWall: post.postToWall || (post as any).post_to_wall,
            postToMessage: post.postToMessage || (post as any).post_to_message,
        };
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async syncPosts() {
        const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
        const localPort = this.config.get<string>('GATE_HTTP_PORT') || '3000';
        const configuredGateUrl = this.config.get<string>('GATE_URL') || (isDocker ? 'http://gate:3000' : `http://localhost:${localPort}`);
        const gateUrl = !isDocker && configuredGateUrl.includes('://gate') ? `http://localhost:${localPort}` : configuredGateUrl;
        const vkTypes = [PostType.VK, PostType.VK2]; 
        const currentRepeatableJobs = await this.queue.getRepeatableJobs();
        const queuedPostIds = currentRepeatableJobs.map(j => j.id).filter((id): id is string => !!id);
        let allActiveIds: string[] = [];

        for (const type of vkTypes) {
            try {
                const response = await axios.get(`${gateUrl}/posts`, {
                    params: { page: 1, limit: 9999, type }
                });
                const items = response.data.items as PostDTO[] || [];
                const activePosts = items.filter(p => p.active);
                allActiveIds.push(...activePosts.map(p => p.id));

                for (const post of activePosts) {
                    await this.schedulePost(post);
                }
            } catch (e) {}
        }

        for (const queuedId of queuedPostIds) {
            if (!allActiveIds.includes(queuedId)) {
                await this.removePostFromQueue(queuedId);
            }
        }
    }
}
