import {Ctx, InjectBot, On, Wizard, WizardStep} from "nestjs-telegraf";
import { Message } from "telegraf/types";
import {ConfigService} from "@nestjs/config";
import {Context, Scenes, Telegraf} from "telegraf";
import axios from "axios";
import {UserDTO} from "@domains";

export interface AddEmailWizardState extends Scenes.WizardSessionData {
    id: string;
    currentEmail?: string;
}

@Wizard("add-email-wizard", {botName: "clientBot"})
export class ClientAddEmailWizardService {

    constructor(
        private readonly config: ConfigService,
        @InjectBot('clientBot') private readonly clientBot: Telegraf<Context>,
    ) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext<AddEmailWizardState>) {
        const state = ctx.scene.session as AddEmailWizardState;
        const currentEmail = state.currentEmail;

        let messageText = '✉️ Добавление или изменение Email\n\n';

        if (currentEmail) {
            messageText += `Ваш текущий email: ${currentEmail}.\n`;
            messageText += 'Введите новую почту ниже, если хотите ее изменить.';
        } else {
            messageText += 'Пожалуйста, введите свой email, чтобы получать рассылку на почту.';
        }

        await ctx.reply(messageText);
        ctx.wizard.next();
    }
    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext<AddEmailWizardState>) {
        const message = ctx.message as Message.TextMessage;
        const state = ctx.scene.session as AddEmailWizardState;

        if (!message || !('text' in message)) {
            await ctx.reply('Это не похоже на email. Пожалуйста, введите корректный адрес электронной почты.');
            return;
        }

        const mail = message.text.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(mail)) {
            await ctx.reply('Неверный формат email. Пожалуйста, введите корректный адрес, например, `example@domain.com`.');
            return;
        }

        try {
            const id = state.id;
            const response = await axios.put(`${this.config.get<string>('GATE_URL')}/users/${id}`, {
                email: mail,
            });
            const data: UserDTO = response.data;
            await ctx.reply(`🎉 Поздравляю! Ваш email для рассылки успешно изменен на ${data.email}.`);
            await ctx.scene.leave();
        } catch (e) {
            console.error(e);
            await ctx.reply('Произошла ошибка при сохранении email. Пожалуйста, попробуйте снова или обратитесь в поддержку.');
            await ctx.scene.leave();
        }
    }
}