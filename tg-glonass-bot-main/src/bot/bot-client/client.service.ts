import {Update, Ctx, Start, InjectBot, Command, Action} from 'nestjs-telegraf';
import {Markup, Scenes, Telegraf} from 'telegraf';
import axios from "axios";
import {ConfigService} from "@nestjs/config";
import {UserDTO, UserRole} from "@domains";
import {Context} from "telegraf";
import {OnModuleInit} from "@nestjs/common";
import {AddEmailWizardState} from "./add-email";

@Update()
export class ClientService implements OnModuleInit {
    constructor(
        @InjectBot('clientBot')
        private clientBot: Telegraf,
        private readonly config: ConfigService,
    ) {}

    async onModuleInit() {
        const adminCommands = [
            { command: 'add_email', description: 'Добавить почту из рассылки' },
            { command: 'remove_email', description: 'Удалить почту из рассылки' },
            { command: 'delete_profile', description: 'Удалить профиль для рассылки' },
        ];
        try {
            await this.clientBot.telegram.setMyCommands(adminCommands);
            console.log('Client bot: Меню команд успешно установлено.');
        } catch (error) {
            console.error('Ошибка установки меню команд:', error);
        }
    }

    @Start()
    async onStart(@Ctx() ctx: Context) {
        const firstName = ctx.from?.first_name || 'дорогой пользователь';

        await ctx.reply(
            `Привет, ${firstName}! 👋 \n\nЯ бот, который поможет тебе быть в курсе всех новостей.`,
            Markup.inlineKeyboard([
                Markup.button.callback("Начать", "start_btn")
            ])
        );
    }
    @Action('start_btn')
    async handleStartButton(@Ctx() ctx: Context) {
        console.log('start next')
        await ctx.reply(
            'Перед тем как продолжить, пожалуйста, подтвердите рассылку:',
            Markup.inlineKeyboard([
                [Markup.button.callback('✅ Согласиться и подписаться', 'confirm_user')],
                [Markup.button.callback('❌ Отказаться', 'leave_user')],
            ])
        );
    }


    @Action('confirm_user')
    async onConfirmUser(@Ctx() ctx: Context) {
        await ctx.answerCbQuery();

        const name = ctx.from?.first_name || 'Неизвестный';
        const tgId = ctx.from?.id;

        if (!tgId) {
            await ctx.reply('Извините, не удалось получить ваш Telegram ID. Попробуйте перезапустить бота.');
            return;
        }

        try {
            const data: UserDTO.Create = {
                name,
                tgId: tgId.toString(),
                role: UserRole.CLIENT
            }
            const response = await axios.post(`${this.config.get<string>('GATE_URL')}/users`, {
                ...data
            });

            const userData: UserDTO = response.data;

            await ctx.reply(
                `🎉 Поздравляю, ${userData.name}! Вы успешно подписаны на нашу рассылку.`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✉️ Добавить email для дублирования рассылки', 'add_email')],
                    [Markup.button.callback('Продолжить без email', 'skip_email_prompt')],
                ])
            );
        } catch (error) {
            console.error(error);
            await ctx.reply('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
        }
    }

    @Action('add_email')
    async onAddEmail(@Ctx() ctx: Scenes.WizardContext<AddEmailWizardState>) {
        await this.startAddEmailWizard(ctx);
    }

    @Action('skip_email_prompt')
    async onSkipEmailPrompt(@Ctx() ctx: Context) {
        await ctx.answerCbQuery();
        await ctx.reply('Хорошо! Вы всегда можете добавить email позже командой /add_email.');
    }

    @Action('leave_email')
    async onLeaveEmail(@Ctx() ctx: Context) {
        await ctx.answerCbQuery();
        await ctx.reply('Понимаю. Вы всегда можете вернуться к этому вопросу позже. Спасибо!');
    }

    @Action('leave_user')
    async onLeaveUser(@Ctx() ctx: Context) {
        await ctx.answerCbQuery();
        await ctx.reply('Очень жаль, что вы не с нами. Если передумаете, просто нажмите /start!');
    }

    @Command('add_email')
    async startAddEmailWizard(@Ctx() ctx: Scenes.WizardContext<AddEmailWizardState>) {
        const tgId = ctx.from?.id?.toString();
        if (!tgId) return ctx.reply('Не удалось определить ваш ID.');
        const scene = ctx.scene.session as AddEmailWizardState;

        try {
            const response = await axios.get(`${this.config.get<string>('GATE_URL')}/auth/login/tg/${tgId}`);
            const data: UserDTO = response.data;

            scene.id = data.id;
            if (data.email !== null) {
                scene.currentEmail = data.email;
            }

            await ctx.scene.enter('add-email-wizard', { id: data.id, currentEmail: data.email });
        } catch (e) {
            console.error(e);
            await ctx.reply('Сначала вам нужно зарегистрироваться. Нажмите /start.');
        }
    }

    @Command('remove_email')
    async removeEmail(@Ctx() ctx: Context) {
        const tgId = ctx.from?.id?.toString();
        if (!tgId) return ctx.reply('Не удалось определить ваш ID.');

        try {
            const response = await axios.get(`${this.config.get<string>('GATE_URL')}/auth/login/tg/${tgId}`);
            const data: UserDTO = response.data;

            await axios.put(`${this.config.get<string>('GATE_URL')}/users/${data.id}`, {
                email: null,
            });

            await ctx.reply(`✅ Ваш email ${data.email} успешно удален из рассылки. Вы по-прежнему будете получать уведомления в Telegram.`);
        } catch (e) {
            console.error(e);
            await ctx.reply('Произошла ошибка при удалении email. Убедитесь, что вы зарегистрированы.');
        }
    }

    @Command('delete_profile')
    async deleteProfile(@Ctx() ctx: Context) {
        const tgId = ctx.from?.id?.toString();
        if (!tgId) return ctx.reply('Не удалось определить ваш ID.');

        try {
            const response = await axios.delete(`${this.config.get<string>('GATE_URL')}/auth/logout/tg/${tgId}`);
            const data: UserDTO = response.data;
            await ctx.reply(`Спасибо, что были с нами, ${data.name}. Ваш профиль и все данные успешно удалены. До свидания! 👋`);
        } catch (e) {
            console.error(e);
            await ctx.reply('Произошла ошибка при удалении профиля. Пожалуйста, попробуйте позже.');
        }
    }
}