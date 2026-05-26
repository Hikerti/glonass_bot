import { Wizard, WizardStep, Ctx, Action } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { UserTypeEmail } from '@domains';
import { ExcelUserImportService } from '@infrastract';

interface ImportWizardState {
    fileBuffer?: Buffer;
}

@Wizard('import-users-wizard', { botName: 'adminBot' })
export class ImportUsersWizard {
    constructor(private readonly importer: ExcelUserImportService) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply('Отправьте Excel-файл (.xlsx) с пользователями:', Markup.inlineKeyboard([
            [Markup.button.callback("❌ Отмена", "cancel_import")]
        ]));
        ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext) {
        const message = ctx.message as any;
        
        if (!message?.document) {
            return ctx.reply('Пожалуйста, отправьте именно файл.');
        }

        const file = message.document;
        if (!file.file_name.endsWith('.xlsx')) {
            return ctx.reply('Файл должен быть в формате .xlsx');
        }

        try {
            // Скачиваем файл в буфер и сохраняем в state
            const fileLink = await ctx.telegram.getFileLink(file.file_id);
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            
            (ctx.wizard.state as ImportWizardState).fileBuffer = Buffer.from(arrayBuffer);

            await ctx.reply(
                'Файл получен. Теперь выберите, с какой почты будет рассылка для этих пользователей:',
                Markup.inlineKeyboard([
                    [Markup.button.callback('ostrovbot@ostrov59.ru', 'import_mail_1')],
                    [Markup.button.callback('m.zharovskyh@ostrov59.ru', 'import_mail_2')],
                    [Markup.button.callback('avtolyx18@yandex.ru', 'import_mail_3')],
                    [Markup.button.callback('❌ Отмена', 'cancel_import')]
                ])
            );
            ctx.wizard.next();
        } catch (e) {
            await ctx.reply('Ошибка при загрузке файла. Попробуйте снова.');
            return ctx.scene.leave();
        }
    }

    @Action(/import_mail_(.+)/)
    async processImport(@Ctx() ctx: Scenes.WizardContext & { callbackQuery: { data: string } }) {
        const state = ctx.wizard.state as ImportWizardState;
        const mailTypeMap = {
            'import_mail_1': UserTypeEmail['MAIL'],
            'import_mail_2': UserTypeEmail['MAIL2'],
            'import_mail_3': UserTypeEmail['MAIL3'],
        };

        const selectedType = mailTypeMap[ctx.callbackQuery.data];

        if (!state.fileBuffer) {
            await ctx.answerCbQuery('Файл потерян, начните заново');
            return ctx.scene.leave();
        }

        await ctx.editMessageText('Импортирую... пожалуйста, подождите ⏳');

        const result = await this.importer.importUserFromExcel(state.fileBuffer, selectedType);

        if (result) {
            await ctx.reply(
                `Импорт завершён ✅\nСоздано пользователей: ${result.count}\nДубликатов обработано: ${result.duplicateCount}`,
            );
        } else {
            await ctx.reply('Произошла ошибка при сохранении данных в базу ❌');
        }

        await ctx.answerCbQuery();
        return ctx.scene.leave();
    }

    @Action('cancel_import')
    async cancel(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply('Импорт отменен.');
        await ctx.answerCbQuery();
        return ctx.scene.leave();
    }
}
