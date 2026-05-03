import {Global, Module} from "@nestjs/common";
import {ExcelUserImportService} from "./excel-user-import.service";
import {ExcelUserExportService} from "./excel-user-export.service";

@Global()
@Module({
    providers: [ExcelUserImportService, ExcelUserExportService],
    exports: [ExcelUserImportService, ExcelUserExportService],
})

export class ExcelModule {}