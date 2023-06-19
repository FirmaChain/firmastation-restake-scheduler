import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDbService } from './mongo-db.service';
import { HistoriesModule } from 'src/histories/histories.module';
import { RoundsModule } from 'src/rounds/rounds.module';
import { LatestRoundsModule } from 'src/latest-rounds/latest-rounds.module';
import { StatusesModule } from 'src/statuses/statuses.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService]
    }),
    HistoriesModule,
    RoundsModule,
    LatestRoundsModule,
    StatusesModule,
  ],
  providers: [MongoDbService],
  exports: [MongoDbService]
})
export class MongoDbModule {}
