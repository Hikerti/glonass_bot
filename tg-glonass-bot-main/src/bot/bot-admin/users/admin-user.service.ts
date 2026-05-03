import {Action, Command, Ctx, InjectBot, Update} from "nestjs-telegraf";
import {ConfigService} from "@nestjs/config";
import axios from "axios";
import {UserDTO} from "@domains";
import {Context, Markup, Scenes, Telegraf} from "telegraf";
import {PaginationType} from "@shared";

@Update()
export class AdminUserService {
    private currentPage = 1

    constructor(private config: ConfigService, @InjectBot('adminBot') private readonly bot: Telegraf<Context>) {}

    @Command('get_users')
    async getUsersList(@Ctx() ctx) {
        this.currentPage = 1;
        await this.sendUsersPage(ctx, this.currentPage);
    }

    @Command('create_user')
    async createUser(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.scene) {
            console.error('Scene not found! Wizard not registered?');
            return;
        }
        await ctx.scene.enter('create-user-wizard');
    }

    @Action('next_users')
    async nextPage(@Ctx() ctx) {
        this.currentPage++;
        await this.sendUsersPage(ctx, this.currentPage);
    }

    @Action('prev_users')
    async prevPage(@Ctx() ctx) {
        if (this.currentPage > 1) this.currentPage--;
        await this.sendUsersPage(ctx, this.currentPage);
    }

    private async sendUsersPage(ctx, page: number) {
        await ctx.deleteMessage()

        const limit = 10;
        try {
            const response = await axios.get(`${this.config.get<string>('GATE_URL')}/users`, {
                method: "GET",
                params: { page, limit },
            });

            const data: PaginationType<UserDTO> = response.data;

            const message = data.items
                .map((user: UserDTO, index: number) =>
                    `${(page - 1) * limit + index + 1}. ${user.name} (${user.email ?? 'нет почты'}) (${user.tgId ?? 'нет телеграмма'})`
                )
                .join('\n');

            if (!data.isLast) {
                await ctx.reply(`Всего пользователей: ${data.total}\n\n${message}`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('⬅️ Назад', 'prev_users'), Markup.button.callback('Вперёд ➡️', 'next_users')]
                    ])
                );
            } else {
                await ctx.reply(`Всего пользователей: ${data.total}\n\n${message}`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('⬅️ Назад', 'prev_users')]
                    ])
                );
            }

        } catch (e) {
            console.error('Ошибка при получении пользователей:', e.response?.data || e.message);
            await ctx.reply('Не удалось загрузить список пользователей.');
        }
    }
}