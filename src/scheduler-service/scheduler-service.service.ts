import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { HistoriesService } from '../histories/histories.service';
import { RoundsService } from '../rounds/rounds.service';
import { Histories } from '../schemas/histories.schema';
import { Rounds } from '../schemas/rounds.schema';
import { Statuses } from '../schemas/statuses.schema';
import { StatusesService } from '../statuses/statuses.service';
import { RestakeMongoDB } from '../utils/mongoDB';
import { RestakeSDK } from '../utils/restakeSDK';

@Injectable()
export class SchedulerServiceService {
  private isEnableErrorCronHandling: boolean;
  private errorHandlingTryCount: number;

  constructor(
    private readonly historiesService: HistoriesService,
    private readonly roundsService: RoundsService,
    private readonly statusesService: StatusesService
  ) {
    this.isEnableErrorCronHandling = false;
    this.errorHandlingTryCount = 0;
  }

  @Cron(CronExpression.EVERY_4_HOURS, {
    name: 'restake_handling',
    timeZone: 'Etc/UTC'
  })
  async handleCron() {
    console.log(`[INFO - Handling] Cron handling: ${new Date().toISOString()}`);

    if (this.isEnableErrorCronHandling) {
      console.log(`[WARN - Handling] Error handling cron is running`);
      return ;
    }

    try {
      await this.restakeSchedule();
      this.isEnableErrorCronHandling = false;
    } catch (e) {
      console.log(`[ERROR - Handling] Can't restake schedule. Start error clone handing`);
      this.isEnableErrorCronHandling = true;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'restake_error_handling',
    timeZone: 'Etc/UTC'
  })
  async errorHandleCron() {
    console.log(`[INFO - Error Handling] Error cron handling: ${new Date().toISOString()}`);
    if (!this.isEnableErrorCronHandling) {
      console.log(`[WARN - Error Handling] Handling cron is running`);
    }

    if (this.errorHandlingTryCount >= 6) {
      this.errorHandlingTryCount = 0;
      this.isEnableErrorCronHandling = false;
    }
    try {
      await this.restakeSchedule();
      
      this.isEnableErrorCronHandling = false;
    } catch (e) {
      console.log(`[ERROR - Handling] Can't restake schedule. Start error clone handing`);
      this.isEnableErrorCronHandling = true;
      this.errorHandlingTryCount++;
    }
  }

  async restakeSchedule() {
    const scheduleStartDate = new Date();

    // Chain Txs
    const restakeSDK = await RestakeSDK();
    const transactionResults = await restakeSDK.restakeProcess(); 

    // MongoDB
    const restakeMongoDB = RestakeMongoDB();
    let historyResult: Histories;
    let roundResult: Rounds;
    let statusResult: Statuses;

    try {
      const roundCount = await this.historiesService.getCount();
      const historyData = restakeMongoDB.makeHistoryData(transactionResults, roundCount);
      historyResult = await this.historiesService.create(historyData);
    } catch (e) {
      console.log(`[ERROR] Can't save history data`);
      // TODO (save txt file)
    }

    try {
      const roundData = restakeMongoDB.makeRoundData(historyResult, scheduleStartDate);
      roundResult = await this.roundsService.create(roundData);
    } catch (e) {
      console.log(`[ERROR] Can't save round data`);
      // TODO (save txt file)
    }
    
    try {
      const nowStatusData = await this.statusesService.findOne();
      const nextScheduleDate = new Date(scheduleStartDate.setHours(scheduleStartDate.getHours() + 4)).toISOString();

      statusResult = restakeMongoDB.makeStatusData(nowStatusData, roundResult, nextScheduleDate);

      if (nowStatusData === null || nowStatusData === undefined) {
        // create status
        await this.statusesService.create(statusResult);
      } else {
        // update status
        await this.statusesService.update(statusResult);
      }
    } catch (e) {
      console.log(`[ERROR] Can't save status data`);
      // TODO (save txt file)
    }
  }
}
