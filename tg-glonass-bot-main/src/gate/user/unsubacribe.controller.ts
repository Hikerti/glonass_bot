import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Response } from 'express';
import { UserTypeEmail } from '@domains';
import { UserService } from './user.service';

@Controller('mail-actions')
export class UnsubscribeController {
    constructor(
        private readonly userService: UserService,
        private readonly config: ConfigService,
    ) {}

    @Get('unsubscribe')
    async unsubscribe(
        @Query('email') email: string,
        @Query('typeEmail') typeEmail: UserTypeEmail | undefined,
        @Query('token') token: string,
        @Res() res: Response,
    ) {
        if (!email || !token) {
            throw new BadRequestException('Missing parameters');
        }

        if (typeEmail && !Object.values(UserTypeEmail).includes(typeEmail)) {
            throw new BadRequestException('Invalid email channel');
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        try {
            const secret = this.config.get('JWT_SECRET') || 'fallback_secret';
            const expectedToken = crypto
                .createHmac('sha256', secret)
                .update(typeEmail ? `${email}:${typeEmail}` : email)
                .digest('hex')
                .substring(0, 12);

            if (token !== expectedToken) {
                throw new Error('Invalid unsubscribe token');
            }

            const deletedUser = await this.userService.unsubscribeByEmail(email, typeEmail);
            const title = deletedUser ? 'Вы успешно отписаны' : 'Вы уже отписаны';
            const message = deletedUser
                ? `Email <b>${email}</b> больше не будет получать письма.`
                : `Email <b>${email}</b> не найден в базе рассылки.`;

            return res.send(`
                <!doctype html>
                <html lang="ru">
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>Отписка от рассылки</title>
                    </head>
                    <body style="margin: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
                        <div style="max-width: 560px; margin: 80px auto; padding: 32px; background: #fff; border-radius: 16px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,.08);">
                            <h2 style="margin: 0 0 16px;">${title}</h2>
                            <p style="font-size: 16px; color: #444;">
                                ${message}
                            </p>
                        </div>
                    </body>
                </html>
            `);
        } catch (e) {
            return res.status(400).send(`
                <!doctype html>
                <html lang="ru">
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>Ошибка отписки</title>
                    </head>
                    <body style="margin: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
                        <div style="max-width: 560px; margin: 80px auto; padding: 32px; background: #fff; border-radius: 16px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,.08);">
                            <h2 style="margin: 0 0 16px;">Ошибка отписки</h2>
                            <p style="font-size: 16px; color: #444;">
                                Ссылка недействительна или устарела.
                            </p>
                        </div>
                    </body>
                </html>
            `);
        }
    }
}
