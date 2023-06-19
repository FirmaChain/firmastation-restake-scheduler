import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class RestakeBotService {
  private bot: Telegraf;
  private chatId: string;
  
  private notiBot: Telegraf;
  private notiChatId: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {
    this.bot = new Telegraf(this.configService.get<string>('TELEGRAM_STATUS_BOT'));
    this.chatId = this.configService.get<string>('TELEGRAM_STATUS_CHAT_ID');

    this.notiBot = new Telegraf(this.configService.get<string>('TELEGRAM_NOTI_BOT'));
    this.notiChatId = this.configService.get<string>('TELEGRAM_NOTI_CHAT_ID');

    // Start telegram bot
    this.bot.launch();
    this.notiBot.launch();
  }

  addCommandListener(command: string, callback: (message: string) => Promise<void>) {
    try {
      this.bot.hears(command, async () => {
        return await callback("");
      });
    } catch (e) {
      throw `❌ Command registration failed. : ${e}`;
    }
  }

  async sendMessage(message: string) {
    try {
      await this.bot.telegram.sendMessage(this.chatId, message, { disable_web_page_preview: true });
      this.logger.info(`✅ Success sendMessage : ${message}`);
    } catch (e) {
      this.logger.error(`❌ Failed sendMessage : ${message}`);
    }
  }

  async sendNotiMessage(message: string) {
    try {
      await this.notiBot.telegram.sendMessage(this.notiChatId, message, { disable_web_page_preview: true });
      this.logger.info(`✅ Success sendNotiMessage : ${message}`);
    } catch (e) {
      this.logger.error(`❌ Failed sendNotiMessage : ${message}`);
    }
  }
}