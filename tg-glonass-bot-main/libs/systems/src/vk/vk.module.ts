import {Global, Module} from "@nestjs/common";
import {ConfigModule} from "@nestjs/config";
import {BullModule} from "@nestjs/bull";
import {VkProcessor} from "./vk.processor";
import {VkScheduler} from "./vk.scheduler";
import {VkService} from "./vk.service";
import {VkMediaService} from "./vk-photo.service";

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ["envs/local/gate/app.env", "envs/local/gate/vk.env"], isGlobal: true,
        }),
        BullModule.registerQueue({
            name: 'vk',
        }),
    ],
    providers: [VkProcessor, VkScheduler, VkService, VkMediaService],
    exports: [VkProcessor, VkScheduler, VkService, VkMediaService]
})
export class VkModule {}
