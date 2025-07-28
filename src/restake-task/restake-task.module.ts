import { Module } from '@nestjs/common';

import { RestakeTaskService } from './restake-task.service';
import { RestakeModule } from 'src/restake/restake.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongoDbModule } from 'src/mongo-db/mongo-db.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [ScheduleModule.forRoot(), RestakeModule, MongoDbModule],
  providers: [RestakeTaskService, ConfigService],
  exports: [RestakeTaskService],
})
export class RestakeTaskModule {}
