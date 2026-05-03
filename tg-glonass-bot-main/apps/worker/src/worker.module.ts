import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule, VkModule } from '@systems';

const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
const redisHost = process.env.REDIS_HOST || (isDocker ? 'redis' : 'localhost');

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        'envs/local/gate/app.env',
        'envs/local/gate/mail.env',
        'envs/local/gate/vk.env',
        'envs/local/database/redis.env',
      ],
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: {
        host: redisHost,
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    ScheduleModule.forRoot(),
    EmailModule,
    VkModule,
  ],
})
export class WorkerModule {}