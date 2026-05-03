import {Command, Ctx, InjectBot, Update} from "nestjs-telegraf";
import {Context, Telegraf} from "telegraf";
import {ExcelUserExportService, ExcelUserImportService} from "@infrastract";

@Update()
export class AdminExcelService {

    constructor(
        private importer: ExcelUserImportService,
        private exporter: ExcelUserExportService,
        @InjectBot('adminBot') private readonly bot: Telegraf<Context>
    ) {}

    @Command('get_excel_table')
    async getUsersFromExcel(@Ctx() ctx: Context) {
        try {
            const buffer = await this.exporter.exportUserFromExcel();

            if (!buffer) {
                await ctx.reply('Нет пользователей для выгрузки ❌');
            }

            await ctx.replyWithDocument({
                source: buffer,
                filename: 'users.xlsx',
            });
        } catch (e) {
            console.error(e);
            await ctx.reply('Не удалось выгрузить Excel файл ❌');
        }
    }

    @Command('create_users_from_table')
        async startImport(@Ctx() ctx: Context) {
        await (ctx as any).scene.enter('import-users-wizard');
    }
}