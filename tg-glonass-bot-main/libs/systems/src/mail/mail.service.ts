import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PostType } from "@domains";
import { AbstractNotificationService, ChannelJobData } from "../forwarding-message";
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

type MailAttachment = NonNullable<nodemailer.SendMailOptions['attachments']>[number];
const DEFAULT_MAIL_SUBJECT = 'Важное уведомление';
const BROKEN_DEFAULT_MAIL_SUBJECT = 'Р’Р°Р¶РЅРѕРµ СѓРІРµРґРѕРјР»РµРЅРёРµ';

@Injectable()
export class MailService extends AbstractNotificationService {
    private transporters: Record<string, nodemailer.Transporter> = {};
    private readonly logger = new Logger(MailService.name);
    private readonly configs: Partial<Record<PostType, { user: string; pass: string; host: string }>> = {};

    constructor(private readonly config: ConfigService) {
        super();
        this.configs = {
            [PostType.MAIL]: this.resolveMailConfig('MAIL', 'smtp.mail.ru', 'ostrovbot@ostrov59.ru', 'CHANGE_ME'),
            [PostType.MAIL2]: this.resolveMailConfig('MAIL2', 'smtp.mail.ru', 'kz@ostrov59.ru', 'CHANGE_ME'),
            [PostType.MAIL3]: this.resolveMailConfig('MAIL3', 'smtp.yandex.ru', 'avtolyx18@yandex.ru', 'CHANGE_ME'),
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

    private getUnsubscribeHash(email: string, type?: PostType): string {
        const secret = this.config.get('JWT_SECRET') || 'fallback_secret';
        const payload = type ? `${email}:${type}` : email;
        return crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 12);
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private getMediaFilename(url: string, index: number): string {
        try {
            const filename = new URL(url).pathname.split('/').filter(Boolean).pop();
            return filename ? decodeURIComponent(filename) : `file-${index + 1}`;
        } catch {
            return url.split('/').filter(Boolean).pop() || `file-${index + 1}`;
        }
    }

    private isInlineImage(url: string, contentType?: string): boolean {
        if (contentType?.toLowerCase().startsWith('image/')) return true;

        try {
            return /\.(jpe?g|png|gif|webp)$/i.test(new URL(url).pathname);
        } catch {
            return /\.(jpe?g|png|gif|webp)$/i.test(url);
        }
    }

    private getHeaderValue(value: unknown): string | undefined {
        if (Array.isArray(value)) return value[0];
        return typeof value === 'string' ? value : undefined;
    }

    private getStorageFetchUrl(url: string): string {
        try {
            const parsedUrl = new URL(url);
            const bucket = this.config.get<string>('S3_BUCKET') || 'local';

            if (!parsedUrl.pathname.startsWith(`/${bucket}/`)) {
                return url;
            }

            const internalEndpoint = this.config.get<string>('S3_INTERNAL_ENDPOINT') || this.config.get<string>('S3_URL');
            if (!internalEndpoint) {
                return url;
            }

            return `${internalEndpoint.replace(/\/$/, '')}${parsedUrl.pathname}${parsedUrl.search}`;
        } catch {
            return url;
        }
    }

    private normalizeSubject(subject?: string): string {
        const normalized = subject?.trim() || DEFAULT_MAIL_SUBJECT;

        if (normalized === BROKEN_DEFAULT_MAIL_SUBJECT) {
            return DEFAULT_MAIL_SUBJECT;
        }

        return normalized;
    }

    private async prepareMailMedia(media: string[]) {
        const attachments: MailAttachment[] = [];
        const inlinePreviewHtml: string[] = [];
        const linkPreviewHtml: string[] = [];
        const plainLinks: string[] = [];

        for (const [index, url] of media.entries()) {
            const filename = this.getMediaFilename(url, index);
            const escapedFilename = this.escapeHtml(filename);
            const escapedUrl = this.escapeHtml(url);

            try {
                const res = await axios.get(this.getStorageFetchUrl(url), { responseType: 'arraybuffer' });
                const contentType = this.getHeaderValue(res.headers['content-type']);

                if (this.isInlineImage(url, contentType)) {
                    const cid = `media-${index}-${crypto.randomUUID()}@tg-glonass`;

                    attachments.push({
                        filename,
                        content: Buffer.from(res.data),
                        cid,
                        contentDisposition: 'inline',
                    });
                    inlinePreviewHtml.push(`
                        <div style="margin: 16px 0;">
                            <img src="cid:${cid}" alt="${escapedFilename}" style="display: block; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #eeeeee;">
                        </div>
                    `);

                    continue;
                }
            } catch (e) {
                this.logger.warn(`[MailMedia] Failed to load ${url}: ${e.message}`);
            }

            plainLinks.push(`${filename}: ${url}`);
            linkPreviewHtml.push(`
                <p style="margin: 8px 0;">
                    <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">&#1054;&#1090;&#1082;&#1088;&#1099;&#1090;&#1100; &#1092;&#1072;&#1081;&#1083;: ${escapedFilename}</a>
                </p>
            `);
        }

        return {
            attachments,
            html: [...inlinePreviewHtml, ...linkPreviewHtml].join(''),
            text: plainLinks.length ? `\n\n${plainLinks.join('\n')}` : '',
        };
    }

    private async prepareDownloadAttachments(attachmentUrls: string[]) {
        const attachments: MailAttachment[] = [];
        const linkPreviewHtml: string[] = [];
        const plainLinks: string[] = [];

        for (const [index, url] of attachmentUrls.entries()) {
            const filename = this.getMediaFilename(url, index);
            const escapedFilename = this.escapeHtml(filename);
            const escapedUrl = this.escapeHtml(url);

            try {
                const res = await axios.get(this.getStorageFetchUrl(url), { responseType: 'arraybuffer' });
                const contentType = this.getHeaderValue(res.headers['content-type']);

                attachments.push({
                    filename,
                    content: Buffer.from(res.data),
                    contentType,
                    contentDisposition: 'attachment',
                });

                continue;
            } catch (e) {
                this.logger.warn(`[MailAttachment] Failed to load ${url}: ${e.message}`);
            }

            plainLinks.push(`${filename}: ${url}`);
            linkPreviewHtml.push(`
                <p style="margin: 8px 0;">
                    <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">&#1057;&#1082;&#1072;&#1095;&#1072;&#1090;&#1100; &#1092;&#1072;&#1081;&#1083;: ${escapedFilename}</a>
                </p>
            `);
        }

        return {
            attachments,
            html: linkPreviewHtml.join(''),
            text: plainLinks.length ? `\n\nФайлы для скачивания:\n${plainLinks.join('\n')}` : '',
        };
    }

    public async send(data: ChannelJobData): Promise<void> {
        const { users, text, media, attachments, subject, type } = data;
        const transporter = this.transporters[type];
        const config = this.configs[type];
        const publicGateUrl = this.getPublicGateUrl();

        if (!transporter || !config) {
            this.logger.warn(`SMTP config for ${type} is missing, skip mailing`);
            return;
        }

        const preparedMedia = await this.prepareMailMedia(media || []);
        const preparedAttachments = await this.prepareDownloadAttachments(attachments || []);
        const htmlText = this.escapeHtml(text).replace(/\n/g, '<br>');
        const normalizedSubject = this.normalizeSubject(subject);

        for (const user of users) {
            if (!user.email) continue;

            const hash = this.getUnsubscribeHash(user.email, type);
            const unsubscribeUrl = `${publicGateUrl}/mail-actions/unsubscribe?email=${encodeURIComponent(user.email)}&typeEmail=${encodeURIComponent(type)}&token=${hash}`;

            try {
                await transporter.sendMail({
                    from: config.user,
                    to: user.email,
                    subject: normalizedSubject,
                    text: `${text}${preparedMedia.text}${preparedAttachments.text}\n\nОтписаться: ${unsubscribeUrl}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                            <div style="margin-bottom: 20px;">${htmlText}</div>
                            ${preparedMedia.html}
                            ${preparedAttachments.html}
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #999; text-align: center;">
                                Вы получили это письмо, так как подписаны на рассылку.
                                <br><br>
                                <a href="${unsubscribeUrl}" style="color: #ff4444; text-decoration: underline;">Отписаться от рассылки</a>
                            </p>
                        </div>
                    `,
                    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
                    attachments: [...preparedMedia.attachments, ...preparedAttachments.attachments]
                });
                await new Promise(res => setTimeout(res, 100));
            } catch (e) {
                this.logger.error(`Error ${user.email}: ${e.message}`);
            }
        }
    }

    async removeUserByEmail(email: string, token: string, type?: PostType) {
        const expectedHash = this.getUnsubscribeHash(email, type);
        if (token !== expectedHash) {
            throw new Error('Invalid unsubscribe token');
        }

        const gateUrl = this.getGateUrl();
        try {
            await axios.patch(`${gateUrl}/users/unsubscribe-by-email`, {
                email: email,
                typeEmail: type,
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
