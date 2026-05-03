import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelUserExportService, ExcelUserImportService } from '@infrastract';
import { UserTypeEmail } from '@domains';

@Controller('excel')
export class ExcelController {
  constructor(
    private readonly excelUserImportService: ExcelUserImportService,
    private readonly excelUserExportService: ExcelUserExportService,
  ) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @Query('typeEmail') typeEmail?: UserTypeEmail,
  ) {
    if (!file) {
      throw new BadRequestException('Excel file is required');
    }

    const normalizedTypeEmail = typeEmail || UserTypeEmail.MAIL;

    const result = await this.excelUserImportService.importUserFromExcel(
      file.buffer,
      normalizedTypeEmail,
    );

    if (!result) {
      throw new BadRequestException('Failed to import users from Excel');
    }

    return result;
  }

  @Get('export')
  async exportUsers(@Res() res: Response) {
    const buffer = await this.excelUserExportService.exportUserFromExcel();

    if (!buffer) {
      throw new BadRequestException('No users to export');
    }

    const fileName = `users_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send(buffer);
  }
}