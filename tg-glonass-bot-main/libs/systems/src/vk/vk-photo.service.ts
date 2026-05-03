import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { basename, extname } from 'path';

@Injectable()
export class VkMediaService {
    private readonly logger = new Logger(VkMediaService.name);
    private readonly apiVersion = '5.131';

    async uploadMedia(urls: string[], token: string, groupId: number, target: 'wall' | 'message'): Promise<string> {
        const attachments: string[] = [];
        for (const url of urls) {
            try {
                const attachment = await this.processFile(url, token, groupId, target);
                attachments.push(attachment);
            } catch (e) {
                this.logger.error(`Error uploading file ${url}: ${e.message}`);
            }
        }
        return attachments.join(',');
    }

    private async processFile(url: string, token: string, groupId: number, target: 'wall' | 'message'): Promise<string> {
        const extension = extname(url).toLowerCase();
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const docExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.pdf', '.txt', '.rtf', '.zip', '.rar'];

        if (imageExtensions.includes(extension)) {
            return this.uploadPhoto(url, token, groupId, target);
        } else if (docExtensions.includes(extension)) {
            return this.uploadDocument(url, token, groupId, target);
        } else {
            return this.uploadDocument(url, token, groupId, target);
        }
    }

    private async uploadPhoto(url: string, token: string, groupId: number, target: 'wall' | 'message'): Promise<string> {
        const method = target === 'wall' ? 'photos.getWallUploadServer' : 'photos.getMessagesUploadServer';
        const serverData = await this.getUploadServer(method, token, groupId);
        const buffer = await this.downloadFile(url);
        const filename = basename(url) || 'image.jpg';

        const form = new FormData();
        form.append('file1', buffer, { filename });

        const uploadResponse = await this.uploadToVk(serverData.upload_url, form);
        const saveMethod = target === 'wall' ? 'photos.saveWallPhoto' : 'photos.saveMessagesPhoto';
        const saved = await this.savePhoto(saveMethod, uploadResponse, token, groupId);

        return `photo${saved.owner_id}_${saved.id}`;
    }

    private async uploadDocument(url: string, token: string, groupId: number, target: 'wall' | 'message'): Promise<string> {
        const method = target === 'wall' ? 'docs.getWallUploadServer' : 'docs.getMessagesUploadServer';
        const serverData = await this.getUploadServer(method, token, groupId);
        const buffer = await this.downloadFile(url);
        const filename = basename(url) || 'file.dat';

        const form = new FormData();
        form.append('file', buffer, { filename });

        const uploadResponse = await this.uploadToVk(serverData.upload_url, form);
        const saved = await this.saveDocument(uploadResponse, token, filename);

        return `doc${saved.owner_id}_${saved.id}`;
    }

    private async getUploadServer(method: string, token: string, groupId: number) {
        const res = await axios.get(`https://api.vk.com/method/${method}`, {
            params: { access_token: token, v: this.apiVersion, group_id: groupId }
        });
        if (res.data.error) throw new Error(JSON.stringify(res.data.error));
        return res.data.response;
    }

    private async downloadFile(url: string): Promise<Buffer> {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    }

    private async uploadToVk(url: string, form: FormData) {
        const res = await axios.post(url, form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });
        return res.data;
    }

    private async savePhoto(method: string, data: any, token: string, groupId: number) {
        const params: any = { access_token: token, v: this.apiVersion, server: data.server, hash: data.hash };
        if (method === 'photos.saveWallPhoto') {
            params.group_id = groupId;
            params.photo = data.photo;
        } else {
            params.photo = data.photo;
        }

        const res = await axios.post(`https://api.vk.com/method/${method}`, null, { params });
        if (res.data.error) throw new Error(JSON.stringify(res.data.error));
        return res.data.response[0];
    }

    private async saveDocument(data: any, token: string, title: string) {
        const res = await axios.post(`https://api.vk.com/method/docs.save`, null, {
            params: { access_token: token, v: this.apiVersion, file: data.file, title }
        });
        if (res.data.error) throw new Error(JSON.stringify(res.data.error));
        const result = res.data.response;
        return result.doc || (Array.isArray(result) ? result[0] : result);
    }
}