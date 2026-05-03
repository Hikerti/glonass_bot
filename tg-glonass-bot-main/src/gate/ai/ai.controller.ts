import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AiService } from '@integrations';
import { GeneratePostTextDTO, GeneratePostTextResponseDTO } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-post')
  async generatePostText(@Body() dto: GeneratePostTextDTO): Promise<GeneratePostTextResponseDTO> {
    const rawPrompt = dto.prompt?.trim();

    if (!rawPrompt || rawPrompt.length < 3) {
      throw new BadRequestException('Prompt must contain at least 3 characters.');
    }

    const channelContext = dto.channel ? `Канал рассылки: ${dto.channel}.\n` : '';
    const prompt = [
      'Сгенерируй готовый текст поста для рассылки контрагентам.',
      'Пиши по-русски, ясно, деловым стилем, без markdown-разметки.',
      'Не добавляй лишние кавычки вокруг результата.',
      channelContext,
      `Задача/промпт: ${rawPrompt}`,
    ].join('\n');

    const text = await this.aiService.generatePost(prompt);
    return { text };
  }
}
