import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as Joi from '@hapi/joi';

import { AppController } from './app.controller';
import { winstonOptions } from 'src/utils/logger.util';
import { RestakeSchedulerModule } from 'src/restake-scheduler/restake-scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        
        RESTAKE_MNEMONIC: Joi.string().required(),
        RESTAKE_MINIMUM_REWARD: Joi.number().required(),
        RESTAKE_BATCH_COUNT: Joi.number().required(),
        RESTAKE_RETRY_COUNT: Joi.number().required(),

        TELEGRAM_STATUS_BOT: Joi.string().required(),
        TELEGRAM_STATUS_CHAT_ID: Joi.string().required(),
      })
    }),
    WinstonModule.forRoot(winstonOptions),
    RestakeSchedulerModule,
  ],
  controllers: [AppController],
  providers: []
})
export class AppModule {}
