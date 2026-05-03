// ai.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {GigaChat} from 'gigachat-node';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AiService {
    private client: GigaChat;
    private readonly logger = new Logger(AiService.name);

    constructor(
        private readonly configService: ConfigService,
    ) {
        const authKey = this.configService.get<string>('GIGACHAT_AUTH_KEY');

        if (!authKey) {
            throw new InternalServerErrorException('GIGACHAT_AUTH_KEY is not configured.');
        }

        this.client = new GigaChat({
            clientSecretKey: authKey,
            isIgnoreTls: true,        // ВАЖНО: Игнорируем ошибки сертификатов (Sber/Mintsifry)
            isPersonal: true,         // true для физлиц, false для юрлиц
            autoRefreshToken: true,
        });
    }

    async generatePost(prompt: string): Promise<string> {
        try {
            await this.client.createToken(); // Убеждаемся, что токен есть

            const response = await this.client.completion({
                model: 'GigaChat', // Используй 'GigaChat' или 'GigaChat:latest'
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1024,
            });

            const generatedText = response.choices?.[0]?.message?.content;

            if (!generatedText) {
                this.logger.warn('GigaChat вернул пустой ответ: ' + JSON.stringify(response));
                throw new Error('AI вернул пустой текст');
            }

            return generatedText.trim();

        } catch (error: any) {
            // Детальное логирование ошибки, чтобы не было [object Object]
            const errorDetails = error.response?.data || error.message || JSON.stringify(error);
            this.logger.error(`GigaChat API Error: ${JSON.stringify(errorDetails, null, 2)}`);

            throw new InternalServerErrorException(
                `Ошибка генерации: ${error.message || 'Неизвестная ошибка'}`
            );
        }
    }
}