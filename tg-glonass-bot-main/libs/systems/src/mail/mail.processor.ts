import { Processor, Process } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from 'bull';
import { MailService } from "./mail.service";

@Processor('mail')
export class MailProcessor {
    private readonly logger = new Logger(MailProcessor.name);
    constructor(private mailService: MailService) {}

    @Process()
    async handleMailJob(job: Job) {
        this.logger.log(`[Processor] 📬 Взял в работу пост ${job.id} (Юзеров: ${job.data.users.length})`);
        try {
            await this.mailService.send(job.data);
            this.logger.log(`[Processor] ✨ Рассылка ${job.id} завершена`);
        } catch (e) {
            this.logger.error(`[Processor] Ошибка рассылки ${job.id}: ${e.message}`);
            throw e;
        }
    }
}