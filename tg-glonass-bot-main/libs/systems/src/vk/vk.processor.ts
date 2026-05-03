import { Processor, Process, InjectQueue } from "@nestjs/bull";
import type { Job, Queue } from 'bull';
import { VkService } from "./vk.service";

@Processor('vk')
export class VkProcessor {
    constructor(
        private vkService: VkService,
        @InjectQueue('vk') private vkQueue: Queue
    ) {}

    @Process()
    async handleVkJob(job: Job) {
        try {
            await this.vkService.send(job.data);
        } catch (e) {
            console.error(`[Processor] Error handling vk job ${job.id}:`, e);
            throw e;
        }
    }
}