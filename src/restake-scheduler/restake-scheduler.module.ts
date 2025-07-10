import { Module } from '@nestjs/common';

import { RestakeSchedulerService } from './restake-scheduler.service';
import { RestakeBotModule } from 'src/restake-bot/restake-bot.module';
import { RestakeTaskModule } from 'src/restake-task/restake-task.module';

@Module({
  imports: [RestakeBotModule, RestakeTaskModule],
  providers: [RestakeSchedulerService],
})
export class RestakeSchedulerModule {}
