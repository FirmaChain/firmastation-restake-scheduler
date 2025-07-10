import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { MongoDbService } from './mongo-db.service';
import { RoundsModule } from 'src/rounds/rounds.module';
import { LatestRoundsModule } from 'src/latest-rounds/latest-rounds.module';
import { StatusesModule } from 'src/statuses/statuses.module';
import { RestakeBotService } from 'src/restake-bot/restake-bot.service';
import { RestakeBotModule } from 'src/restake-bot/restake-bot.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    RoundsModule,
    LatestRoundsModule,
    StatusesModule,
    RestakeBotModule,
  ],
  providers: [MongoDbService],
  exports: [MongoDbService],
})
export class MongoDbModule implements OnModuleInit {
  constructor(
    private readonly restakeBotService: RestakeBotService,
    @Inject(getConnectionToken()) private readonly connection: Connection,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    this.connection.on('error', (error) => {
      this.logger.log(`Failed connect mongodb error: ${error}`);
      this.restakeBotService.sendNotiMessage(
        `MongoDB Connect Error: ${error.message}`,
      );
    });
  }
}
