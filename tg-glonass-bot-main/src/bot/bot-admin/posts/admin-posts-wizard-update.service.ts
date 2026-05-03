import { Wizard, WizardStep, Ctx, Action } from 'nestjs-telegraf';
import { Scenes, Markup, Context, Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectBot } from 'nestjs-telegraf';
import { Message, InputMediaPhoto } from "telegraf/types";
import { PostDTO } from "@domains";
import { S3Service } from "@infrastract";
import { AdminGetMedia } from "./admin-get-media";
import { BroadcastScheduler, MailScheduler, VkScheduler } from "@systems";

interface UpdatePostWizardState {
    postId?: string;
    text?: string;
    media: string[];
    newMedia: string[];
    action: string | null;
}

interface MySessionData extends Scenes.WizardSessionData {
    post?: PostDTO;
}

export interface MyContext extends Scenes.WizardContext<MySessionData> {
    session: Scenes.WizardSession<MySessionData> & { post?: PostDTO };
}

@Wizard('update-post-wizard', { botName: "adminBot" })
export class AdminPostsWizardUpdateService extends AdminGetMedia {
    constructor(
        protected readonly config: ConfigService,
        @InjectBot('adminBot') protected readonly bot: Telegraf<Context>,
        protected readonly s3Service: S3Service,
        private readonly broadcastScheduler: BroadcastScheduler,
        private readonly vkScheduler: VkScheduler,
        private readonly mailScheduler: MailScheduler,
    ) {
        super(config, bot, s3Service);
    }

    private state(ctx: MyContext): UpdatePostWizardState {
        const s = ctx.wizard.state as any;
        s.media ??= [];
        s.newMedia ??= [];
        s.action ??= null;
        return s;
    }

    private async replyWithLocalMedia(ctx: MyContext, url: string, caption?: string, extraMarkup?: any) {
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            const source = Buffer.from(res.data);
            const lower = url.toLowerCase();
            const extra = { caption, ...extraMarkup };

            if (lower.match(/\.(mp4|mov)$/)) await ctx.replyWithVideo({ source }, extra);
            else if (lower.match(/\.(mp3|wav)$/)) await ctx.replyWithAudio({ source }, extra);
            else if (lower.match(/\.(pdf|doc|docx|xls|xlsx|zip)$/)) await ctx.replyWithDocument({ source, filename: url.split('/').pop() }, extra);
            else await ctx.replyWithPhoto({ source }, extra);
        } catch (e) {
            await ctx.reply(`[Ошибка медиа]: ${url}`, extraMarkup);
        }
    }

    @WizardStep(1)
    async step1(@Ctx() ctx: MyContext) {
        const s = this.state(ctx);
        const post = ctx.session.post;

        if (!post) {
            await ctx.reply('Сессия пуста');
            return ctx.scene.leave();
        }

        s.postId = post.id;
        s.text = post.text ?? '';
        s.media = Array.isArray(post.media) ? [...post.media] : [];

        await ctx.reply(
            `Текст:\n\n${s.text}`,
            Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Изменить текст', 'edit_text')],
                [Markup.button.callback('➡️ Перейти к медиа', 'to_media')],
                [Markup.button.callback('Завершить', 'cancel_all')],
            ])
        );
        ctx.wizard.next();
    }

    @Action('edit_text')
    async onEditText(@Ctx() ctx: MyContext) {
        this.state(ctx).action = 'wait_new_text';
        await ctx.reply('Отправьте новый текст:');
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: MyContext) {
        const s = this.state(ctx);
        if (s.action === 'wait_new_text' && ctx.message && 'text' in ctx.message) {
            s.text = (ctx.message as Message.TextMessage).text;
            s.action = null;
            await ctx.reply(`Новый текст принят`, Markup.inlineKeyboard([
                [Markup.button.callback('💾 Далее', 'save_text')],
                [Markup.button.callback('↩️ Отмена', 'cancel_text')]
            ]));
            return;
        }
        ctx.wizard.next();
        await this.showMedia(ctx);
    }

    @Action(['save_text', 'cancel_text', 'to_media'])
    async handleTextActions(@Ctx() ctx: MyContext) {
        const s = this.state(ctx);
        if ((ctx as any).callbackQuery.data === 'cancel_text') s.text = ctx.session.post?.text || s.text;
        s.action = null;
        ctx.wizard.selectStep(2);
        await this.showMedia(ctx);
    }

    private async showMedia(ctx: MyContext) {
        const s = this.state(ctx);
        const combined = [...s.media, ...s.newMedia];

        if (combined.length === 0) {
            return ctx.reply('Медиа нет', Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить', 'add_media')],
                [Markup.button.callback('➡️ Далее', 'final')]
            ]));
        }

        await this.replyWithLocalMedia(ctx, combined[0], 'Оставить?', Markup.inlineKeyboard([
            [Markup.button.callback('✔️ Оставить', 'keep_media'), Markup.button.callback('❌ Удалить', 'del_media')],
            [Markup.button.callback('Завершить', 'cancel_all')]
        ]));
    }

    @Action(['keep_media', 'del_media'])
    async handleMediaIteration(@Ctx() ctx: MyContext) {
        const s = this.state(ctx);
        const isKeep = (ctx as any).callbackQuery.data === 'keep_media';
        
        const target = s.media.length > 0 ? s.media : s.newMedia;
        if (isKeep) target.push(target.shift()!);
        else target.shift();

        await this.nextMediaOrFinish(ctx);
    }

    private async nextMediaOrFinish(ctx: MyContext) {
        const s = this.state(ctx);
        if (s.media.length + s.newMedia.length > 0) return this.showMedia(ctx);
        await ctx.reply('Медиа закончились', Markup.inlineKeyboard([
            [Markup.button.callback('➕ Добавить', 'add_media')],
            [Markup.button.callback('➡️ Далее', 'final')]
        ]));
    }

    @Action('add_media')
    async addMedia(@Ctx() ctx: MyContext) {
        this.state(ctx).action = 'add_media';
        await ctx.reply("Отправьте файлы, затем 'стоп'");
    }

    @WizardStep(3)
    async stepAddMedia(@Ctx() ctx: MyContext) {
        const s = this.state(ctx);
        if (s.action !== 'add_media') return;

        if (ctx.message && 'text' in ctx.message && ctx.message.text.toLowerCase() === 'стоп') {
            s.action = null;
            return this.showFinal(ctx);
        }

        const uploaded = await this.uploadMediaFromTelegram(ctx.message as Message).catch(() => null);
        if (uploaded) {
            s.newMedia.push(uploaded.url);
            await ctx.reply('Загружено');
        }
    }

    @Action('final')
    async final(@Ctx() ctx: MyContext) { await this.showFinal(ctx); }

    private async showFinal(ctx: MyContext) {
        const s = this.state(ctx);
        const finalMedia = [...s.media, ...s.newMedia];
        
        const photos: InputMediaPhoto[] = [];
        for (const url of finalMedia) {
            if (url.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                photos.push({ type: 'photo', media: { source: Buffer.from(res.data) } });
            }
        }

        if (photos.length > 0) await ctx.replyWithMediaGroup(photos);
        await ctx.reply(s.text || 'Без текста', Markup.inlineKeyboard([
            [Markup.button.callback('💾 Сохранить', 'confirm')],
            [Markup.button.callback('❌ Отмена', 'cancel_all')]
        ]));
    }

@Action('confirm')
    async confirm(@Ctx() ctx: MyContext) {
        const s = this.state(ctx);
        try {
            const url = `${this.config.get('GATE_URL')}/posts/${s.postId}`;
            
            await axios.put(url, { 
                text: s.text, 
                media: [...s.media, ...s.newMedia] 
            });
            
            const { data: updatedPost } = await axios.get(url);
            
            const schedulers = { 
                vk: this.vkScheduler, 
                tg: this.broadcastScheduler, 
                mail: this.mailScheduler 
            };

            const targetScheduler = schedulers[updatedPost.type as keyof typeof schedulers] as any;
            
            if (targetScheduler && typeof targetScheduler.updatePost === 'function') {
                await targetScheduler.updatePost(updatedPost);
            }

            await ctx.reply('✅ Изменения успешно сохранены и обновлены в очередях');
        } catch (e) {
            console.error(e);
            await ctx.reply('❌ Ошибка при сохранении данных');
        }
        return ctx.scene.leave();
    }

    @Action('cancel_all')
    async cancelAll(@Ctx() ctx: MyContext) {
        await ctx.reply('Отменено');
        return ctx.scene.leave();
    }
}