import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { MONGODB_URI } from './config';
import { HistoriesModule } from './histories/histories.module';
import { RestakeController } from './restake/restake.controller';
import { RestakeService } from './restake/restake.service';
import { RoundsModule } from './rounds/rounds.module';
import { StatusesModule } from './statuses/statuses.module';
import { SchedulerServiceService } from './scheduler-service/scheduler-service.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(MONGODB_URI),
    StatusesModule,
    RoundsModule,
    HistoriesModule
  ],
  controllers: [RestakeController, ],
  providers: [RestakeService, SchedulerServiceService, ]
})
export class AppModule {}
