import { Command, Ctx, InjectBot, Start, Update } from "nestjs-telegraf";
import { Telegraf, Context } from "telegraf";
import { OnModuleInit } from "@nestjs/common";

@Update()
export class AdminGeneralUpdateService implements OnModuleInit {
    constructor(
        @InjectBot('adminBot')
        private readonly adminBot: Telegraf<Context>,
    ) {}

    async onModuleInit() {
        const adminCommands = [
            { command: 'get_users', description: 'Получение списка всех пользователей' },
            { command: 'create_user', description: 'Добавить пользователя для рассылки' },
            { command: 'create_post', description: 'Создание контента для рассылки' },
            { command: 'get_posts_list', description: 'Получение списка постов для рассылки на ostrovbot@ostrov59.ru' },
            { command: 'get_posts_list2', description: 'Получение списка постов для рассылки на kz@ostrov59.ru' },
            { command: 'get_posts_list3', description: 'Получение списка постов для рассылки на avtolyx18@yandex.ru' },
            { command: 'get_posts_tg', description: 'Получение списка постов для рассылки в телеграмм бота' },
            { command: 'get_posts_tg2', description: 'Получение списка постов для рассылки в телеграмм группу 1' },
            { command: 'get_posts_tg3', description: 'Получение списка постов для рассылки в телеграмм группу 2' },
            { command: 'get_posts_vk', description: 'Получение списка постов для рассылки в ВК группу 1' },
            { command: 'get_posts_vk2', description: 'Получение списка постов для рассылки в ВК группу 1' },
            { command: 'get_excel_table', description: 'Получение базы пользователей в виде excel' },
            { command: 'create_users_from_table', description: 'Создание пользователей из таблицы excel' },
        ];
        try {
            await this.adminBot.telegram.setMyCommands(adminCommands);
        } catch (error) {
            console.error('Ошибка установки меню команд:', error);
        }
    }

    @Start()
    async onStart(@Ctx() ctx: Context) {
        try {
            await ctx.deleteMessage();
        } catch (e) {
            console.log('Не удалось удалить сообщение (это нормально):', e.message);
        }

        await ctx.reply('Добро пожаловать в админ панель Glonass-bot.\n' +
            'Если хочешь узнать что я умею, напиши /help');
    }

    @Command('help')
    async help(@Ctx() ctx: Context) {
        try {
            await ctx.deleteMessage();
        } catch (e) {}

        await ctx.reply(
            'Доступные команды:\n' +
            '/userList - показать всех пользователей\n' +
            '/createPost - отправить сообщение всем\n' +
            '/start - статистика бота'
        )
    }
}
