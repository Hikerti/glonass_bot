import { Message } from "telegraf/types";
import axios, { AxiosError } from "axios";
import { ConfigService } from "@nestjs/config";
import { InjectBot } from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { S3Service } from "@infrastract";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AdminGetMedia {
  private readonly logger = new Logger(AdminGetMedia.name);

  constructor(
    protected readonly config: ConfigService,
    @InjectBot('adminBot') protected readonly bot: Telegraf<Context>,
    protected readonly s3Service: S3Service
  ) {
    this.logger.log('AdminGetMedia инициализирован');
  }

  /**
   * Извлекает file_id из сообщения Telegram
   */
  protected extractMediaFileId(msg: Message): string | null {
    this.logger.debug(`Извлекаем file_id из сообщения типа: ${Object.keys(msg).filter(k => !['chat', 'message_id', 'date'].includes(k))}`);
    
    if ("photo" in msg) {
      const fileId = msg.photo[msg.photo.length - 1]?.file_id;
      this.logger.debug(`Фото: получен file_id ${fileId}`);
      return fileId;
    }
    
    if ("video" in msg) {
      const fileId = msg.video?.file_id;
      this.logger.debug(`Видео: получен file_id ${fileId}`);
      return fileId;
    }
    
    if ("audio" in msg) {
      const fileId = msg.audio?.file_id;
      this.logger.debug(`Аудио: получен file_id ${fileId}`);
      return fileId;
    }
    
    if ("document" in msg) {
      const fileId = msg.document?.file_id;
      this.logger.debug(`Документ: получен file_id ${fileId}`);
      return fileId;
    }
    
    this.logger.warn(`Неизвестный тип сообщения для извлечения file_id`);
    return null;
  }

  /**
   * Определяет MIME-тип из сообщения Telegram
   */
  protected getMimeTypeFromMessage(msg: Message): string | null {
    if ("photo" in msg) {
      return 'image/jpeg';
    }
    
    if ("video" in msg) {
      return msg.video.mime_type || 'video/mp4';
    }
    
    if ("audio" in msg) {
      return msg.audio.mime_type || 'audio/mpeg';
    }
    
    if ("document" in msg) {
      return msg.document.mime_type || 'application/octet-stream';
    }
    
    return null;
  }

  /**
   * Генерирует имя файла из сообщения Telegram
   */
  protected getFileNameFromMessage(msg: Message): string | null {
    const timestamp = Date.now();
    
    if ("photo" in msg) {
      return `photo_${timestamp}.jpg`;
    }
    
    if ("video" in msg) {
      return msg.video.file_name || `video_${timestamp}.mp4`;
    }
    
    if ("audio" in msg) {
      return msg.audio.file_name || `audio_${timestamp}.mp3`;
    }
    
    if ("document" in msg) {
      return msg.document.file_name || `document_${timestamp}.dat`;
    }
    
    return null;
  }

  /**
   * Загружает медиафайл из Telegram в S3/MinIO
   */
  protected async uploadMediaFromTelegram(msg: Message): Promise<{ url: string } | null> {
    this.logger.log('🔄 Начало загрузки медиа из Telegram');
    
    // 1. Извлекаем file_id
    const fileId = this.extractMediaFileId(msg);
    if (!fileId) {
      this.logger.error('❌ Не удалось извлечь file_id из сообщения');
      return null;
    }

    this.logger.debug(`📎 Получен file_id: ${fileId}`);

    let telegramFileUrl: string | null = null;
    let buffer: Buffer | null = null;

    try {
      // 2. Получаем информацию о файле из Telegram API
      this.logger.debug('📡 Получаю информацию о файле от Telegram API...');
      const tgFile = await this.bot.telegram.getFile(fileId);
      
      if (!tgFile.file_path) {
        this.logger.error('❌ Telegram не вернул file_path для файла');
        return null;
      }

      this.logger.debug(`📄 Telegram file info: ${JSON.stringify(tgFile)}`);

      // 3. Формируем URL для скачивания файла
      const token = this.config.get<string>('ADMIN_BOT_TOKEN');
      if (!token) {
        this.logger.error('❌ ADMIN_BOT_TOKEN не найден в конфигурации');
        return null;
      }

      telegramFileUrl = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
      this.logger.debug(`🔗 URL файла в Telegram: ${telegramFileUrl}`);

      // 4. Скачиваем файл
      this.logger.debug('⬇️ Начинаю скачивание файла...');
      const startDownloadTime = Date.now();
      
      const fileResp = await axios.get(telegramFileUrl, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 минуты таймаут
        maxContentLength: 200 * 1024 * 1024, // 200MB максимум
        headers: {
          'User-Agent': 'TelegramBot/1.0'
        }
      });

      const downloadTime = Date.now() - startDownloadTime;
      this.logger.debug(`✅ Файл скачан за ${downloadTime}ms, статус: ${fileResp.status}`);

      buffer = Buffer.from(fileResp.data);
      this.logger.debug(`📊 Размер файла: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Проверка размера
      if (buffer.length === 0) {
        this.logger.error('❌ Скачанный файл пустой (0 байт)');
        return null;
      }

      if (buffer.length > 100 * 1024 * 1024) { // 100MB
        this.logger.warn('⚠️ Файл очень большой (>100MB), возможны проблемы с загрузкой в S3');
      }

      // 5. Определяем метаданные файла
      const mimeType = this.getMimeTypeFromMessage(msg) || 'application/octet-stream';
      let originalname = this.getFileNameFromMessage(msg) || `${fileId}`;
      
      // Убираем недопустимые символы из имени файла
      originalname = originalname.replace(/[^\w\d\.\-_]/g, '_');
      
      this.logger.debug(`📁 Метаданные файла:`, {
        mimeType,
        originalname,
        size: buffer.length
      });

      // 6. Загружаем в S3/MinIO
      this.logger.debug('⬆️ Начинаю загрузку в S3/MinIO...');
      const startUploadTime = Date.now();
      
      const uploadData = {
        buffer,
        originalname,
        mimetype: mimeType
      };

      const result = await this.s3Service.uploadFile(uploadData);
      const uploadTime = Date.now() - startUploadTime;
      
      if (!result?.url) {
        this.logger.error('❌ S3Service вернул пустой результат или без URL');
        return null;
      }

      this.logger.log(`✅ Файл успешно загружен в S3 за ${uploadTime}ms`);
      this.logger.debug(`🔗 S3 URL: ${result.url}`);

      return { url: result.url };

    } catch (error) {
      this.handleUploadError(error, telegramFileUrl);
      return null;
    }
  }

  /**
   * Обработчик ошибок при загрузке
   */
  private handleUploadError(error: any, telegramFileUrl: string | null): void {
    this.logger.error('❌ Ошибка при загрузке медиафайла:');
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED') {
        this.logger.error('⏰ Таймаут при скачивании файла');
      } else if (axiosError.code === 'ENOTFOUND') {
        this.logger.error(`🔍 Хост не найден`);
      } else if (axiosError.code === 'ECONNREFUSED') {
        this.logger.error(`🚫 Соединение отклонено`);
      }
      
      this.logger.error(`📡 Axios ошибка:`, {
        message: axiosError.message,
        code: axiosError.code,
        status: axiosError.response?.status,
        url: telegramFileUrl,
        // Используем правильные свойства
        config: axiosError.config?.url ? { url: axiosError.config.url } : undefined
      });
      
    } else if (error.name === 'TimeoutError') {
      this.logger.error('⏰ Таймаут при выполнении операции (90 секунд)');
    } else if (error instanceof Error) {
      this.logger.error(`💥 Ошибка: ${error.message}`);
      this.logger.error(`📝 Stack trace: ${error.stack}`);
    } else {
      this.logger.error(`💥 Неизвестная ошибка:`, error);
    }

    // Логируем дополнительные детали
    if (error.response) {
      this.logger.error(`📊 Response данные:`, {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data ? '...данные присутствуют...' : 'нет данных'
      });
    }

    if (error.request) {
      // error.request может быть разным типом, проверяем свойства
      const requestInfo: any = {};
      
      if (typeof error.request === 'object') {
        if (error.request._currentUrl) {
          requestInfo.url = error.request._currentUrl;
        }
        if (error.request.method) {
          requestInfo.method = error.request.method;
        }
        if (error.request.path) {
          requestInfo.path = error.request.path;
        }
      }
      
      if (Object.keys(requestInfo).length > 0) {
        this.logger.error(`📡 Request данные:`, requestInfo);
      }
    }
  }

  /**
   * Тестовая функция для проверки работы S3
   */
  public async testS3Connection(): Promise<{ success: boolean; message: string; url?: string }> {
    this.logger.log('🧪 Тестирую подключение к S3...');
    
    try {
      const testBuffer = Buffer.from(`Тестовый файл создан ${new Date().toISOString()}`);
      
      const result = await this.s3Service.uploadFile({
        buffer: testBuffer,
        originalname: `test-connection-${Date.now()}.txt`,
        mimetype: 'text/plain'
      });
      
      this.logger.log('✅ S3 подключение работает нормально');
      return {
        success: true,
        message: 'S3 подключение успешно',
        url: result.url
      };
      
    } catch (error) {
      this.logger.error('❌ Ошибка тестирования S3:', error.message);
      return {
        success: false,
        message: `Ошибка S3: ${error.message}`
      };
    }
  }

  /**
   * Получает информацию о размере файла
   */
  public async getFileInfo(msg: Message): Promise<{
    type: string;
    size?: number;
    mimeType?: string;
    fileName?: string;
  }> {
    if ("photo" in msg) {
      return {
        type: 'photo',
        size: msg.photo[msg.photo.length - 1]?.file_size
      };
    }
    
    if ("video" in msg) {
      return {
        type: 'video',
        size: msg.video.file_size,
        mimeType: msg.video.mime_type,
        fileName: msg.video.file_name
      };
    }
    
    if ("audio" in msg) {
      return {
        type: 'audio',
        size: msg.audio.file_size,
        mimeType: msg.audio.mime_type,
        fileName: msg.audio.file_name
      };
    }
    
    if ("document" in msg) {
      return {
        type: 'document',
        size: msg.document.file_size,
        mimeType: msg.document.mime_type,
        fileName: msg.document.file_name
      };
    }
    
    return { type: 'unknown' };
  }
}

// Экспорт интерфейса для использования
export interface MediaUploadResult {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}
