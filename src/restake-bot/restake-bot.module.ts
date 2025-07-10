import { Module } from '@nestjs/common';
import { RestakeBotService } from './restake-bot.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [RestakeBotService, ConfigService],
  exports: [RestakeBotService],
})
export class RestakeBotModule {}
