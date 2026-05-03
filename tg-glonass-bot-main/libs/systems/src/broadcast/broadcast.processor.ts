import { Processor, Process, InjectQueue } from "@nestjs/bull";
import type { Job, Queue } from 'bull';
import {BroadcastService} from "./broadcast.service";

@Processor('broadcast')
export class BroadcastProcessor {
    constructor(
        private tgNotificationService: BroadcastService,
        @InjectQueue('broadcast') private broadcastQueue: Queue
    ) {}

    @Process()
    async handleBroadcastJob(job: Job) {
        try {
            await this.tgNotificationService.send(job.data);


        } catch (e) {
            console.error(`[Processor] Error handling broadcast job ${job.id}:`, e);
            throw e;
        }
    }
}