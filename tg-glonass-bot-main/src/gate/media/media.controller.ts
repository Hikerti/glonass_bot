import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '@infrastract';

@Controller('media')
export class MediaController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string }) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.s3Service.uploadFile(file);
  }

  @Delete(':key')
  async delete(@Param('key') key: string) {
    await this.s3Service.deleteFile(key);

    return { success: true };
  }
}
