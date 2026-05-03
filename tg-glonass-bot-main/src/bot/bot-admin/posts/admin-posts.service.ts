import { Action, Command, Ctx, InjectBot, Update } from "nestjs-telegraf";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { PaginationType } from "@shared";
import { PostDTO, PostType } from "@domains";
import { Context, Markup, Scenes, Telegraf } from "telegraf";
import { InputMediaPhoto } from "telegraf/types";

@Update()
export class AdminPostsService {
    private page = 1;

    constructor(
        private config: ConfigService,
        @InjectBot('adminBot') private readonly bot: Telegraf<Context>
    ) {}

    private async processMedia(ctx: Context, mediaUrls: string[]) {
        const photos: InputMediaPhoto[] = [];
        
        for (const url of mediaUrls) {
            try {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                const lower = url.toLowerCase();

                if (lower.match(/\.(jpg|jpeg|png|gif)$/)) {
                    photos.push({ type: 'photo', media: { source: buffer } });
                } else if (lower.match(/\.(mp4|mov)$/)) {
                    await ctx.replyWithVideo({ source: buffer });
                } else if (lower.match(/\.(mp3|wav)$/)) {
                    await ctx.replyWithAudio({ source: buffer });
                } else {
                    await ctx.replyWithDocument({ source: buffer, filename: url.split('/').pop() });
                }
            } catch (e) {
                console.error(`Error loading media ${url}`, e);
            }
        }

        if (photos.length > 0) {
            await ctx.replyWithMediaGroup(photos);
        }
    }

    private async sendPosts(ctx: any, page: number, typePost: PostType) {
        if (ctx.deleteMessage) await ctx.deleteMessage().catch(() => {});

        const limit = 1;
        try {
            ctx.session.post = {};

            const response = await axios.get(`${this.config.get<string>('GATE_URL')}/posts`, {
                params: { page, limit, type: typePost },
            });

            const data: PaginationType<PostDTO> = response.data;
            
            if (!data.items || data.items.length === 0) {
                await ctx.reply('Постов не найдено.');
                return;
            }

            const post = data.items[0];

            if (post.media && post.media.length > 0) {
                await this.processMedia(ctx, post.media);
            }

            await ctx.reply(
                post.text || 'Без текста',
                Markup.inlineKeyboard([
                    [Markup.button.callback('Удалить пост', 'delete_post')],
                    [Markup.button.callback('⬅️ Назад', typePost === PostType.TG ? 'prev_tg_post' : 'prev_post')],
                    !data.isLast
                        ? [Markup.button.callback('Вперёд ➡️', typePost === PostType.TG ? 'next_tg_post' : 'next_post')]
                        : [],
                ]),
            );

            ctx.session.post = post;
        } catch (e) {
            await ctx.reply('Ошибка загрузки');
            console.error(e);
        }
    }

    @Action('delete_post')
    async editPost(@Ctx() ctx: any) {
        if (!ctx.session.post?.id) return ctx.reply('Пост не найден');

        try {
            await axios.delete(`${this.config.get<string>('GATE_URL')}/posts/${ctx.session.post.id}`);
            await ctx.reply('Пост удален');
            await this.sendPosts(ctx, this.page, PostType.MAIL);
        } catch (e) {
            await ctx.reply('Ошибка удаления');
        }
    }

    @Action(/^(next|prev)_(tg_)?post$/)
    async handlePagination(@Ctx() ctx: Context) {
        const action = (ctx as any).callbackQuery.data;
        const isTg = action.includes('tg_');
        
        if (action.startsWith('next')) this.page++;
        else if (this.page > 1) this.page--;

        await this.sendPosts(ctx, this.page, isTg ? PostType.TG : PostType.MAIL);
    }

    @Command('get_posts_list')
    async getPostsList(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.MAIL);
    }

     @Command('get_posts_list2')
    async getPostsList2(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.MAIL2);
    }

     @Command('get_posts_list3')
    async getPostsList3(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.MAIL3);
    }

    @Command('get_posts_tg')
    async getPostListTg(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.TG);
    }

    @Command('get_posts_tg2')
    async getPostListTg2(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.TG2);
    }

    @Command('get_posts_t3')
    async getPostListTg3(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.TG3);
    }

    @Command('get_posts_vk')
    async getPostsListVk(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.VK);
    }

    @Command('get_posts_vk2')
    async getPostsListVk2(@Ctx() ctx: Context) {
        this.page = 1;
        await this.sendPosts(ctx, this.page, PostType.VK2);
    }

    @Command('create_post')
    async createPostTg(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.scene.enter('create-post-wizard');
    }
}