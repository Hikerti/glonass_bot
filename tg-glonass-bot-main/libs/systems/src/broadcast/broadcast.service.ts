    import { Injectable, Logger } from "@nestjs/common";
    import { ConfigService } from "@nestjs/config";
    import { InjectBot } from "nestjs-telegraf";
    import { Telegraf } from "telegraf";
    import axios from "axios";
    import { InputMediaPhoto, InputMediaVideo } from "telegraf/types";
    import { AbstractNotificationService, ChannelJobData } from "../forwarding-message";
    import { getMediaType } from "@shared";
    import { PostType } from "@domains";

    @Injectable()
    export class BroadcastService extends AbstractNotificationService {
        private readonly logger = new Logger(BroadcastService.name);
        
        private readonly groupMapping = {
            [PostType.TG2]: '',
            [PostType.TG3]: '',
        };

        constructor(
            private readonly config: ConfigService,
            @InjectBot('clientBot') private clientBot: Telegraf,
        ) {
            super();
        }

        async send(data: ChannelJobData) {
            const { users, text, media, type } = data;

            const preparedMedia = await this.prepareMediaBuffers(media);

            if (type === PostType.TG) {
                for (const user of users) {
                    if (user.tgId) {
                        await this.sendToChatPrepared(user.tgId, text, preparedMedia);
                        await new Promise(r => setTimeout(r, 50)); 
                    }
                }
            } 
            else if (this.groupMapping[type]) {
                await this.sendToChatPrepared(this.groupMapping[type], text, preparedMedia);
            }
        }

        private async prepareMediaBuffers(media: string[]) {
            const loaded: { buffer: Buffer; type: string; url: string }[] = [];
            
            if (!media) return loaded;

            for (const url of media) {
                try {
                    const res = await axios.get(url, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(res.data);
                    const type = getMediaType(url);
                    loaded.push({ buffer, type, url });
                } catch (e) {
                    this.logger.error(`File load error ${url}: ${e.message}`);
                }
            }
            return loaded;
        }
        private async sendToChatPrepared(chatId: string | number, text: string, loadedMedia: any[]) {
            try {
                if (loadedMedia.length === 0) {
                    if (text) await this.clientBot.telegram.sendMessage(chatId, text);
                    return;
                }

                const visualGroup: (InputMediaPhoto | InputMediaVideo)[] = loadedMedia
                    .filter(m => m.type === 'photo' || m.type === 'video')
                    .map((m, index) => ({
                        type: m.type as 'photo' | 'video',
                        media: { source: m.buffer },
                        caption: index === 0 ? text : undefined
                    }));

                if (visualGroup.length > 0) {
                    await this.clientBot.telegram.sendMediaGroup(chatId, visualGroup);
                }

                const otherFiles = loadedMedia.filter(m => m.type !== 'photo' && m.type !== 'video');
                for (const file of otherFiles) {
                    const filename = file.url.split('/').pop() || 'file';
                    const options = visualGroup.length === 0 ? { caption: text } : {};
                    
                    if (file.type === 'audio') {
                        await this.clientBot.telegram.sendAudio(chatId, { source: file.buffer }, options);
                    } else {
                        await this.clientBot.telegram.sendDocument(chatId, { source: file.buffer, filename }, options);
                    }
                }
            } catch (e) {
                this.logger.error(`Send error to ${chatId}: ${e.message}`);
            }
        }
    }