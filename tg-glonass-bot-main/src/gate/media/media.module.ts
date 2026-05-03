import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { S3Module } from '@infrastract';

@Module({
  imports: [S3Module],
  controllers: [MediaController],
})
export class MediaModule {}
