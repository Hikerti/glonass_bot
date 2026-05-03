import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { ChannelJobData } from "../forwarding-message";
import { VkMediaService } from "./vk-photo.service";
import { PostType } from "@domains";
@Injectable()
export class VkService {
    private readonly logger = new Logger(VkService.name);
    private configs: Record<string, any> = {};

    constructor(private config: ConfigService, private mediaService: VkMediaService) {
        this.configs[PostType.VK] = { token: this.config.get('VK_ACCESS_TOKEN'), groupId: this.config.get('VK_GROUP_ID') };
        this.configs[PostType.VK2] = { token: this.config.get('VK2_ACCESS_TOKEN'), groupId: this.config.get('VK2_GROUP_ID') };
    }

    public async send(data: ChannelJobData) {
        const config = this.configs[data.type];
        if (!config) return;

        const { token, groupId } = config;
        let attachments = '';

        if (data.media?.length) {
            try {
                const uploadType = data.postToWall ? 'wall' : 'message';
                attachments = await this.mediaService.uploadMedia(data.media, token, groupId, uploadType);
            } catch (e) {
                this.logger.error(`Media Error: ${e.message}`);
            }
        }

        if (data.postToWall) {
            await axios.post('https://api.vk.com/method/wall.post', null, {
                params: {
                    access_token: token,
                    v: '5.131',
                    owner_id: `-${groupId}`,
                    message: data.text,
                    attachments,
                    from_group: 1, 
                }
            }).catch(e => this.logger.error(`Wall Error: ${e.message}`));
        }

        if (data.postToMessage && data.users?.length) {
            for (const user of data.users) {
                if (!user.vkId) continue;
                await axios.post('https://api.vk.com/method/messages.send', null, {
                    params: {
                        access_token: token,
                        v: '5.131',
                        peer_id: user.vkId,
                        message: data.text,
                        attachment: attachments,
                        random_id: Math.floor(Math.random() * 1e9),
                    }
                }).catch(e => this.logger.error(`Msg Error ${user.vkId}: ${e.message}`));
                await new Promise(r => setTimeout(r, 50)); 
            }
        }
    }
}