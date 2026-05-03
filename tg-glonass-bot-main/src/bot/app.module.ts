import { Module } from "@nestjs/common";
import { TelegrafModule } from "nestjs-telegraf";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AdminBotModule } from "./bot-admin";
import {ClientBotModule} from "./bot-client";
import {session} from "telegraf";
import {BullModule} from "@nestjs/bull";
import {BroadcastModule, EmailModule, VkModule} from "@systems";

const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
const redisHost = process.env.REDIS_HOST || (isDocker ? 'redis' : 'localhost');

@Module({
    imports: [
        ConfigModule.forRoot({ envFilePath: ['envs/local/gate/app.env', 'envs/local/bot/bot.env'], isGlobal: true }),

        TelegrafModule.forRootAsync({
            botName: 'clientBot',
            imports: [ClientBotModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                token: config.get('CLIENT_BOT_TOKEN')!,
                include: [ClientBotModule],
                middlewares: [
                    session(),
                ],
            }),
        }),
        TelegrafModule.forRootAsync({
            botName: 'adminBot',
            imports: [AdminBotModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                token: config.get('ADMIN_BOT_TOKEN')!,
                include: [AdminBotModule],
                middlewares: [session()],
            }),
        }),

        BullModule.forRoot({
            redis: {host: redisHost, port: Number(process.env.REDIS_PORT || 6379)},
        }),

        EmailModule,
        BroadcastModule,
        VkModule
    ],
})
export class AppModule {}
