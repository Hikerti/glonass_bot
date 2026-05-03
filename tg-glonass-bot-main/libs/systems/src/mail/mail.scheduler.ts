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

    constructor(
        protected readonly config: ConfigService,
        @InjectQueue('mail') protected readonly queue: Queue
    ) {
        super(config);
    }

    protected filterUsersForPost(users: any[], post: PostDTO): User[] {
        return users.filter(user => {
            const hasEmail = !!user.email;
            const rawUserType = user.typeEmail || user.type_email;
            
            if (!rawUserType) return false;

            const uType = String(rawUserType).toLowerCase().trim();
            const pType = String(post.type).toLowerCase().trim();
            
            return hasEmail && uType === pType;
        });
    }

    protected prepareJobData(post: PostDTO, users: UserDTO[]): ChannelJobData {
        return {
            users,
            text: post.text,
            media: post.media || [],
            date: post.date,
            type: post.type,
            subject: 'Важное уведомление',
        };
    }

    // Метод удаления, который мы добавляем для фикса проблемы с очередью
    async removePostFromQueue(postId: string) {
        const repeatableJobs = await this.queue.getRepeatableJobs();
        const job = repeatableJobs.find(j => j.id === postId);

        if (job) {
            await this.queue.removeRepeatableByKey(job.key);
            this.logger.log(`[Queue] 🗑️ Задача для поста ${postId} удалена из повторов`);
        }
        
        const normalJob = await this.queue.getJob(postId);
        if (normalJob) {
            await normalJob.remove();
            this.logger.log(`[Queue] 🗑️ Обычная задача для поста ${postId} удалена`);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async syncAllMailTypes() {
        const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
        const localPort = this.config.get<string>('GATE_HTTP_PORT') || '3000';
        const configuredGateUrl = this.config.get<string>('GATE_URL') || (isDocker ? 'http://gate:3000' : `http://localhost:${localPort}`);
        const gateUrl = !isDocker && configuredGateUrl.includes('://gate') ? `http://localhost:${localPort}` : configuredGateUrl;
        const types = [PostType.MAIL, PostType.MAIL2, PostType.MAIL3];
        
        const currentRepeatableJobs = await this.queue.getRepeatableJobs();
        const queuedPostIds = currentRepeatableJobs
            .map(j => j.id)
            .filter((id): id is string => !!id); // Убираем undefined для TS

        for (const type of types) {
            try {
                const response = await axios.get(`${gateUrl}/posts`, {
                    params: { type, page: 1, limit: 9999 }
                });
                const dbPosts: PostDTO[] = response.data.items || [];
                
                const activeDbPosts = dbPosts.filter(p => p.active);
                const activeIds = activeDbPosts.map(p => p.id);

                for (const post of activeDbPosts) {
                    await this.schedulePost(post);
                }

                for (const queuedId of queuedPostIds) {
                    if (!activeIds.includes(queuedId)) {
                        await this.removePostFromQueue(queuedId);
                    }
                }
                
            } catch (e) {
                this.logger.error(`[Cron] Ошибка типа ${type}: ${e.message}`);
            }
        }
    }
} 
