import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Response } from 'express';
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
        @Query('token') token: string,
        @Res() res: Response
    ) {
        if (!email || !token) throw new BadRequestException('Missing parameters');

        try {
            const secret = this.config.get('JWT_SECRET') || 'fallback_secret';
            const expectedToken = crypto.createHmac('sha256', secret).update(email).digest('hex').substring(0, 12);

            if (token !== expectedToken) {
                throw new Error('Invalid unsubscribe token');
            }

            await this.userService.unsubscribeByEmail(email);
            return res.send(`
                <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                    <h2>Р’С‹ СѓСЃРїРµС€РЅРѕ РѕС‚РїРёСЃР°РЅС‹</h2>
                    <p>Email ${email} Р±РѕР»СЊС€Рµ РЅРµ РїРѕР»СѓС‡РёС‚ РЅР°С€РёС… РїРёСЃРµРј.</p>
                </div>
            `);
        } catch (e) {
            return res.status(400).send('РћС€РёР±РєР° РѕС‚РїРёСЃРєРё: РЅРµРІРµСЂРЅР°СЏ СЃСЃС‹Р»РєР°.');
        }
    }
}
