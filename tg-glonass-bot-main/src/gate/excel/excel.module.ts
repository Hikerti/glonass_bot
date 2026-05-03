import { Module } from '@nestjs/common';
import { ExcelModule as InfraExcelModule } from '@infrastract';
import { ExcelController } from './excel.controller';

@Module({
  imports: [InfraExcelModule],
  controllers: [ExcelController],
})
export class GateExcelModule {}