import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PostType } from "@domains";
import { AbstractNotificationService, ChannelJobData } from "../forwarding-message";
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class MailService extends AbstractNotificationService {
    private transporters: Record<string, nodemailer.Transporter> = {};
    private readonly logger = new Logger(MailService.name);
    private readonly configs: Partial<Record<PostType, { user: string; pass: string; host: string }>> = {};

    constructor(private readonly config: ConfigService) {
        super();
        this.configs = {
            [PostType.MAIL]: this.resolveMailConfig('MAIL', 'smtp.mail.ru', 'ostrovbot@ostrov59.ru', 'ROk6aJeARaM980lQb5QX'),
            [PostType.MAIL2]: this.resolveMailConfig('MAIL2', 'smtp.mail.ru', 'm.zharovskyh@ostrov59.ru', 'PASSWORD_HERE'),
            [PostType.MAIL3]: this.resolveMailConfig('MAIL3', 'smtp.yandex.ru', 'avtolyx18@yandex.ru', 'avtknadnbziiesgl'),
        };

        for (const [type, config] of Object.entries(this.configs)) {
            if (!config) continue;
            this.transporters[type] = nodemailer.createTransport({
                host: config.host,
                port: 465,
                secure: true,
                auth: { user: config.user, pass: config.pass }
            });
        }
    }

    private resolveMailConfig(prefix: string, defaultHost: string, fallbackUser: string, fallbackPass: string) {
        const user = this.config.get<string>(`${prefix}_USER`) || this.config.get<string>(`${prefix}_NAME`) || fallbackUser;
        const pass = this.config.get<string>(`${prefix}_PASSWORD`) || fallbackPass;
        const host = this.config.get<string>(`${prefix}_HOST`) || defaultHost;

        if (!user || !pass || user === 'CHANGE_ME' || pass === 'CHANGE_ME') {
            return undefined;
        }

        return { user, pass, host };
    }

    private getUnsubscribeHash(email: string): string {
        const secret = this.config.get('JWT_SECRET') || 'fallback_secret';
        return crypto.createHmac('sha256', secret).update(email).digest('hex').substring(0, 12);
    }

    public async send(data: ChannelJobData): Promise<void> {
        const { users, text, media, subject, type } = data;
        const transporter = this.transporters[type];
        const config = this.configs[type];
        const publicGateUrl = this.getPublicGateUrl();

        if (!transporter || !config) {
            this.logger.warn(`SMTP config for ${type} is missing, skip mailing`);
            return;
        }

        const attachments = await Promise.all(
            (media || []).map(async (url) => {
                try {
                    const res = await axios.get(url, { responseType: 'arraybuffer' });
                    return { filename: url.split('/').pop(), content: Buffer.from(res.data) };
                } catch (e) { return null; }
            })
        );
        const validAttachments = attachments.filter(a => a !== null);

        for (const user of users) {
            if (!user.email) continue;

            const hash = this.getUnsubscribeHash(user.email);
            const unsubscribeUrl = `${publicGateUrl}/mail-actions/unsubscribe?email=${encodeURIComponent(user.email)}&token=${hash}`;

            try {
                await transporter.sendMail({
                    from: config.user,
                    to: user.email,
                    subject: subject || 'Уведомление',
                    text: `${text}\n\nОтписаться: ${unsubscribeUrl}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                            <div style="white-space: pre-wrap; margin-bottom: 20px;">${text}</div>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #999; text-align: center;">
                                Вы получили это письмо, так как подписаны на рассылку.
                                <br><br>
                                <a href="${unsubscribeUrl}" style="color: #ff4444; text-decoration: underline;">Отписаться от рассылки</a>
                            </p>
                        </div>
                    `,
                    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
                    attachments: validAttachments
                });
                await new Promise(res => setTimeout(res, 100));
            } catch (e) {
                this.logger.error(`Error ${user.email}: ${e.message}`);
            }
        }
    }

    async removeUserByEmail(email: string, token: string) {
        const expectedHash = this.getUnsubscribeHash(email);
        if (token !== expectedHash) {
            throw new Error('Invalid unsubscribe token');
        }

        const gateUrl = this.getGateUrl();
        try {
            await axios.patch(`${gateUrl}/users/unsubscribe-by-email`, {
                email: email
            });
            this.logger.log(`[Unsubscribe] Пользователь ${email} успешно отписан через Gate`);
        } catch (e) {
            this.logger.error(`[Unsubscribe] Ошибка при обращении к Gate: ${e.message}`);
            throw new Error('Failed to communicate with Gate API');
        }
    }

    private getGateUrl() {
        const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
        const localPort = this.config.get<string>('GATE_HTTP_PORT') || '3000';
        const gateUrl = this.config.get<string>('GATE_URL') || (isDocker ? 'http://gate:3000' : `http://localhost:${localPort}`);

        if (!isDocker && gateUrl.includes('://gate')) {
            return `http://localhost:${localPort}`;
        }

        return gateUrl;
    }

    private getPublicGateUrl() {
        const configuredPublicGateUrl = this.config.get<string>('PUBLIC_GATE_URL');
        if (configuredPublicGateUrl) {
            return configuredPublicGateUrl.replace(/\/$/, '');
        }

        const isDocker = this.config.get<string>('RUNNING_IN_DOCKER') === 'true';
        const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL');
        if (isDocker && publicBaseUrl) {
            return `${publicBaseUrl.replace(/\/$/, '')}/api`;
        }

        return this.getGateUrl();
    }
}
