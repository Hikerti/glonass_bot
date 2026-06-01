import { Processor, Process } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from 'bull';
import { MailService } from "./mail.service";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { PostDTO, UserRole } from "@domains";
import { ChannelJobData } from "../forwarding-message";

@Processor('mail')
export class MailProcessor {
    private readonly logger = new Logger(MailProcessor.name);

    constructor(
        private mailService: MailService,
        private readonly config: ConfigService,
    ) {}

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

    private getPostId(job: Job<ChannelJobData>): string {
        const dataPostId = typeof job.data?.postId === 'string' ? job.data.postId : undefined;
        const idMatch = String(job.id).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

        return dataPostId || idMatch?.[0] || String(job.id).replace(/:immediate$/, '');
    }

    private parseScheduleDate(dateStr: string, boundary: 'start' | 'end'): number | null {
        const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const legacyDate = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        const match = isoDate || legacyDate;

        if (!match) return null;

        const [year, month, day] = isoDate
            ? [Number(match[1]), Number(match[2]), Number(match[3])]
            : [Number(match[3]), Number(match[2]), Number(match[1])];
        const scheduleDate = boundary === 'start'
            ? new Date(year, month - 1, day, 0, 0, 0, 0)
            : new Date(year, month - 1, day, 23, 59, 59, 999);

        return scheduleDate.getTime();
    }

    private parseExpiryDate(dateStr: string): number | null {
        return this.parseScheduleDate(dateStr, 'end');
    }

    private parseStartDate(dateStr?: string | null): number {
        return dateStr ? this.parseScheduleDate(dateStr, 'start') ?? NaN : 0;
    }

    private async getFreshJobData(job: Job<ChannelJobData>): Promise<ChannelJobData | null> {
        const postId = this.getPostId(job);
        const gateUrl = this.getGateUrl();
        const postResponse = await axios.get<PostDTO>(`${gateUrl}/posts/${postId}`);
        const post = postResponse.data;

        if (!post?.active) {
            this.logger.warn(`[Processor] Пост ${postId} не активен, пропускаю рассылку`);
            return null;
        }

        const expiryDate = this.parseExpiryDate(post.date);
        const startDate = this.parseStartDate(post.startDate);
        if (expiryDate === null || Date.now() > expiryDate) {
            this.logger.warn(`[Processor] Пост ${postId} завершён или имеет некорректную дату, пропускаю рассылку`);
            return null;
        }

        if (Number.isNaN(startDate) || Date.now() < startDate) {
            this.logger.warn(`[Processor] Пост ${postId} ещё не достиг даты начала, пропускаю рассылку`);
            return null;
        }

        const usersResponse = await axios.get(`${gateUrl}/users`, {
            params: {
                page: 1,
                limit: 999999,
                role: UserRole.CLIENT,
                typeEmail: post.type,
            },
        });
        const users = usersResponse.data.items || [];

        return {
            ...job.data,
            postId,
            users,
            text: post.text,
            media: post.media || [],
            date: post.date,
            startDate: post.startDate,
            type: post.type,
        };
    }

    @Process()
    async handleMailJob(job: Job<ChannelJobData>) {
        const staleUsersCount = job.data.users?.length || 0;
        this.logger.log(`[Processor] 📬 Взял в работу пост ${job.id} (в старой задаче юзеров: ${staleUsersCount})`);

        try {
            const freshData = await this.getFreshJobData(job);

            if (!freshData) {
                return;
            }

            this.logger.log(`[Processor] 📬 Актуальных юзеров для поста ${freshData.postId}: ${freshData.users.length}`);
            await this.mailService.send(freshData);
            this.logger.log(`[Processor] ✨ Рассылка ${job.id} завершена`);
        } catch (e) {
            this.logger.error(`[Processor] Ошибка рассылки ${job.id}: ${e.message}`);
            throw e;
        }
    }
}
