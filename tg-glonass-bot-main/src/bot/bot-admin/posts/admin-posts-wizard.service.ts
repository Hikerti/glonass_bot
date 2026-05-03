import { ConfigService } from "@nestjs/config";
import { Action, Ctx, InjectBot, Wizard, WizardStep } from "nestjs-telegraf";
import { Context, Markup, Scenes, Telegraf } from "telegraf";
import { Message } from "telegraf/types";
import axios from "axios";
import {  PostType } from "@domains";
import { S3Service } from "@infrastract";
import { AdminGetMedia } from "./admin-get-media";
import { AiService } from "@integrations";

interface CreatePostWizardState {
    text?: string;
    media: string[];
    interval?: string;
    date?: string;
    type?: PostType;
    postToWall: boolean;
    postToMessage: boolean;
    generationPrompt?: string;
    awaitingPrompt?: boolean;
}

interface PostCreationContext extends Scenes.WizardContext {
    wizard: Scenes.WizardContext['wizard'] & {
        state: CreatePostWizardState;
    };
}

@Wizard("create-post-wizard", { botName: "adminBot" })
export class AdminPostsWizardService extends AdminGetMedia {
    constructor(
        protected readonly config: ConfigService,
        @InjectBot('adminBot') protected readonly bot: Telegraf<Context>,
        protected readonly s3Service: S3Service,
        private readonly aiService: AiService,
    ) {
        super(config, bot, s3Service)
    }

    private ensureState(ctx: PostCreationContext) {
        if (!ctx.wizard.state) {
            ((ctx.wizard as any).state) = {
                media: [],
                postToWall: false,
                postToMessage: false
            } as CreatePostWizardState;
        }
        if (!Array.isArray(ctx.wizard.state.media)) ctx.wizard.state.media = [];
    }

    @WizardStep(1)
    async step1(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        await ctx.reply(
            "Шаг 1/5: Введите текст или сгенерируйте его:",
            Markup.inlineKeyboard([
                [Markup.button.callback('✨ Сгенерировать текст', 'generation_text')],
                [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
            ])
        );
        await ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        const msgText = (ctx.message as Message.TextMessage)?.text?.trim();

        if (ctx.wizard.state.awaitingPrompt) {
            if (!msgText) {
                await ctx.reply("Введите промпт для генерации.");
                return;
            }
            ctx.wizard.state.awaitingPrompt = false;
            ctx.wizard.state.generationPrompt = msgText;
            const waitingMsg = await ctx.reply("Генерирую текст...");
            try {
                const generated = await this.aiService.generatePost(msgText);
                const text = generated ?? '';
                if (!text) {
                    await ctx.reply("ИИ вернул пустой ответ. Введите другой промпт.");
                    ctx.wizard.state.awaitingPrompt = true;
                    return;
                }
                ctx.wizard.state.text = text;
                await ctx.reply(
                    text,
                    Markup.inlineKeyboard([
                        [Markup.button.callback("🚀 Использовать", "use_generated_text")],
                        [Markup.button.callback("🔄 Перегенерировать", "regenerate_text")],
                        [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
                    ])
                );
            } catch {
                ctx.wizard.state.awaitingPrompt = true;
                await ctx.reply("Ошибка генерации. Введите промпт снова.");
            } finally {
                try { await ctx.deleteMessage(waitingMsg.message_id); } catch {}
            }
            return;
        }

        if (!msgText) {
            await ctx.reply("Введите текст.");
            return;
        }

        ctx.wizard.state.text = msgText;
        await ctx.reply("Текст принят. Шаг 2/5: Отправьте медиафайл (фото/видео/документ/аудио):", Markup.inlineKeyboard([
            [Markup.button.callback("➡️ Пропустить", "skip_media")], [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
        await ctx.wizard.next();
    }

    @Action("skip_media")
    async skipMedia(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        ctx.wizard.state.media = [];
        await ctx.reply("Медиа пропущено.");
        await ctx.reply("Шаг 3/5: Введите интервал рассылки (например 1d, 2h, 30m):", Markup.inlineKeyboard([
            [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
        await ctx.wizard.next();
    }

    @Action('generation_text')
    async generationText(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        ctx.wizard.state.awaitingPrompt = true;
        await ctx.reply("Введите промпт для генерации текста:");
    }

    @Action("use_generated_text")
    async useGeneratedText(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        await ctx.reply("Текст принят. Шаг 2/5: Отправьте медиафайл (фото/видео/документ/аудио):", Markup.inlineKeyboard([
            [Markup.button.callback("➡️ Пропустить", "skip_media")],
            [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
        await ctx.wizard.next();
    }

    @Action("regenerate_text")
    async regenerateTextAction(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        const prompt = ctx.wizard.state.generationPrompt;
        const waitingMsg = await ctx.reply("Перегенерирую...");
        try {
            const generated = await this.aiService.generatePost(prompt + 'Текст без лишних символов и разметки');
            ctx.wizard.state.text = generated ?? '';
            await ctx.reply(ctx.wizard.state.text, Markup.inlineKeyboard([
                [Markup.button.callback("🚀 Использовать", "use_generated_text")],
                [Markup.button.callback("🔄 Перегенерировать", "regenerate_text")],
                [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
            ]));
        } finally {
            try { await ctx.deleteMessage(waitingMsg.message_id); } catch {}
        }
    }

    @Action("cancel_post_creation")
    async cancelPost(@Ctx() ctx: PostCreationContext) {
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        await ctx.reply("Создание поста отменено.");
        return ctx.scene.leave();
    }

    @WizardStep(3)
    async mediaStep(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        const msg = ctx.message as Message;
        const isMedia = ('photo' in msg) || ('video' in msg) || ('document' in msg) || ('audio' in msg);

        if (!isMedia) {
            await ctx.reply("Отправьте медиафайл или нажмите Закончить.", Markup.inlineKeyboard([
                [Markup.button.callback("Закончить", "finish_media")],
                [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
            ]));
            return;
        }

        const file = await this.uploadMediaFromTelegram(msg);
        if (file?.url) ctx.wizard.state.media.push(file.url);
        await ctx.reply(`Файл загружен (${ctx.wizard.state.media.length}).`, Markup.inlineKeyboard([
            [Markup.button.callback("Загрузить ещё", "upload_more"), Markup.button.callback("Закончить", "finish_media")],
            [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
    }

    @Action("upload_more")
    async uploadMore(@Ctx() ctx: PostCreationContext) {
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        await ctx.reply("Отправьте следующий файл.");
    }

    @Action("finish_media")
    async finishMedia(@Ctx() ctx: PostCreationContext) {
        try { if (ctx.callbackQuery) await ctx.answerCbQuery(); } catch {}
        await ctx.reply("Шаг 3/5: Введите интервал рассылки (например 1d, 2h, 30m):", Markup.inlineKeyboard([
            [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
        await ctx.wizard.next();
    }

    @WizardStep(4)
    async step4(@Ctx() ctx: PostCreationContext) {
        this.ensureState(ctx);
        const text = (ctx.message as Message.TextMessage)?.text?.trim();
        if (!ctx.wizard.state.interval) {
            if (!text) return ctx.reply("Введите интервал:");
            ctx.wizard.state.interval = text;
            return ctx.reply("Шаг 4/5: Введите дату окончания (dd.mm.yyyy):");
        }
        if (!ctx.wizard.state.date) {
            if (!text) return ctx.reply("Введите дату:");
            ctx.wizard.state.date = text;
        }

        await ctx.reply("Шаг 5/5: Выберите основной канал рассылки:", Markup.inlineKeyboard([
            [Markup.button.callback("Телеграмм 📱", "select_tg_group")],
            [Markup.button.callback("Почта 📧", "select_mail_group")],
            [Markup.button.callback("ВК 🌐", "select_vk_group")],
            [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
        await ctx.wizard.next();
    }

    @Action("select_tg_group")
    async selectTgGroup(@Ctx() ctx: PostCreationContext) {
        await ctx.editMessageText("Выберите аккаунт Telegram:", Markup.inlineKeyboard([
            [Markup.button.callback("Тг бот", "set_type_tg"), Markup.button.callback("Первый канал", "set_type_tg2"), Markup.button.callback("Второй канал", "set_type_tg3")],
            [Markup.button.callback("⬅️ Назад", "back_to_main_channels")]
        ]));
    }

    @Action("select_mail_group")
    async selectMailGroup(@Ctx() ctx: PostCreationContext) {
        await ctx.editMessageText("Выберите почту:", Markup.inlineKeyboard([
            [Markup.button.callback("ostrovbot@ostrov59.ru", "set_type_mail"), Markup.button.callback("m.zharovskyh@ostrov59.ru", "set_type_mail2"), Markup.button.callback("avtolyx18@yandex.ru", "set_type_mail3")],
            [Markup.button.callback("⬅️ Назад", "back_to_main_channels")]
        ]));
    }

    @Action("select_vk_group")
    async selectVkGroup(@Ctx() ctx: PostCreationContext) {
        await ctx.editMessageText("Выберите аккаунт ВК:", Markup.inlineKeyboard([
            [Markup.button.callback("Автолюкс", "set_type_vk"), Markup.button.callback("VK 2", "set_type_vk2")],
            [Markup.button.callback("⬅️ Назад", "back_to_main_channels")]
        ]));
    }

    @Action("back_to_main_channels")
    async backToMain(@Ctx() ctx: PostCreationContext) {
        await ctx.editMessageText("Выберите основной канал рассылки:", Markup.inlineKeyboard([
            [Markup.button.callback("Телеграмм 📱", "select_tg_group")],
            [Markup.button.callback("Почта 📧", "select_mail_group")],
            [Markup.button.callback("ВК 🌐", "select_vk_group")],
            [Markup.button.callback("❌ Отменить", "cancel_post_creation")]
        ]));
    }

    @Action(/^set_type_(.+)$/)
    async setType(@Ctx() ctx: PostCreationContext & { match: RegExpExecArray }) {
        const typeStr = ctx.match[1].toUpperCase();
        ctx.wizard.state.type = PostType[typeStr as keyof typeof PostType];
        if (typeStr.startsWith('VK')) return this.vkSend(ctx);
        return this.finalAction(ctx);
    }

    @Action("vk_send")
    async vkSend(@Ctx() ctx: PostCreationContext) {
        await ctx.editMessageText("Шаг 5/5 (ВК): Опции:", Markup.inlineKeyboard([
            [
                Markup.button.callback(`На стену: ${ctx.wizard.state.postToWall ? '✅' : '❌'}`, "vk_wall_toggle"),
                Markup.button.callback(`В чат: ${ctx.wizard.state.postToMessage ? '✅' : '❌'}`, "vk_message_toggle")
            ],
            [Markup.button.callback("✅ Сохранить", "save_final"), Markup.button.callback("⬅️ Назад", "select_vk_group")]
        ]));
    }

    @Action(/vk_(.+)_(toggle)/)
    async vkToggle(@Ctx() ctx: PostCreationContext & { match: RegExpExecArray }) {
        const field = ctx.match[1] === 'wall' ? 'postToWall' : 'postToMessage';
        ctx.wizard.state[field] = !ctx.wizard.state[field];
        return this.vkSend(ctx);
    }

    @WizardStep(5)
    async step5(@Ctx() ctx: PostCreationContext) {
        if (!ctx.callbackQuery) await ctx.reply("Используйте кнопки меню.");
    }

    @Action("save_final")
    async finalAction(@Ctx() ctx: PostCreationContext) {
        const { text, type, date, interval, media, postToWall, postToMessage } = ctx.wizard.state;
        if (type?.toString().startsWith('vk') && !postToWall && !postToMessage) {
            return ctx.answerCbQuery("Выберите стену или чат!", { show_alert: true });
        }
        try {
            await axios.post(`${this.config.get<string>('GATE_URL')}/posts`, { text, type, date, interval, media, postToWall, postToMessage, active: true });
            await ctx.reply("Пост успешно создан!");
        } catch {
            await ctx.reply("Ошибка сохранения.");
        }
        return ctx.scene.leave();
    }
}