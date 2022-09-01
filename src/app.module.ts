import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { MONGODB_URI } from './config';
import { HistoriesModule } from './histories/histories.module';
import { RoundsModule } from './rounds/rounds.module';
import { StatusesModule } from './statuses/statuses.module';
import { SchedulerServiceService } from './scheduler-service/scheduler-service.service';
import { AppController } from './app.controller';
import { LatestRoundsModule } from './latest-rounds/latest-rounds.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(MONGODB_URI),
    StatusesModule,
    RoundsModule,
    HistoriesModule,
    LatestRoundsModule
  ],
  controllers: [AppController],
  providers: [SchedulerServiceService]
})
export class AppModule {}
