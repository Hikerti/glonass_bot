import { Module } from '@nestjs/common';
import { AiModule as IntegrationsAiModule } from '@integrations';
import { AiController } from './ai.controller';

@Module({
  imports: [IntegrationsAiModule],
  controllers: [AiController]
})
export class AiModule {}
