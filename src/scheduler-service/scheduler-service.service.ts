import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IRestakeResult } from '../interfaces/types';
import { ScheduleDate } from '../utils/scheduleDate';

import { HistoriesService } from '../histories/histories.service';
import { RoundsService } from '../rounds/rounds.service';
import { StatusesService } from '../statuses/statuses.service';
import { RestakeSDK } from '../utils/restakeSDK';
import { RestakeMongoDB } from '../utils/mongoDB';

@Injectable()
export class SchedulerServiceService {
  constructor(
    private readonly historiesService: HistoriesService,
    private readonly roundsService: RoundsService,
    private readonly statusesService: StatusesService
  ) {
  }

  @Cron(CronExpression.EVERY_4_HOURS, {
    name: 'restake_handling',
    timeZone: 'Etc/UTC'
  })
  async handleCron() {
    const restakeResult = await this.restakeProcess();
    await this.writeDBProcess(restakeResult);
  }

  async restakeProcess(): Promise<IRestakeResult> {
    const restakeSDK = await RestakeSDK();
    const restakeTargets = await restakeSDK.getRestakeTargets();
    const executeMsgs = await restakeSDK.makeExecuteMsgs(restakeTargets);
    if (executeMsgs.length === 0) {
      return {
        restakeSuccessTxs: [],
        restakeFailedTxs: []
      };
    }
    let executeResult = await restakeSDK.executeRestake(executeMsgs);

    return {
      restakeSuccessTxs: executeResult.restakeSuccessTxs,
      restakeFailedTxs: executeResult.restakeFailedTxs
    }
  }

  async unprocesssRound(round: number) {
    // Create history data
    await this.historiesService.create({
      round: round,
      isHasData: false,
      txInfos: []
    });
    // Create round data
    await this.roundsService.create({
      round: round,
      isHasData: false,
      details: [],
      dateTime: ScheduleDate().before()
    });
    // Create & Update status data
    const statusCount = await this.statusesService.count();
    
    if (statusCount === 0) {
      // Create
      await this.statusesService.create({
        nowRound: round,
        feesAmount: 0,
        restakeAmount: 0,
        restakeCount: 0,
        nextRoundDateTime: ScheduleDate().next()
      });
    } else {
      // Update
      let statusData = await this.statusesService.findOne();
      statusData.nowRound = round;
      statusData.nextRoundDateTime = ScheduleDate().next();
      this.statusesService.update(statusData);
    }
  }

  async writeDBProcess(restakeResult: IRestakeResult) {
    const restakeMongoDB = RestakeMongoDB();
    const nowRound = await this.historiesService.count() + 1;

    let successTxs = restakeResult.restakeSuccessTxs;
    let failedTxs = restakeResult.restakeFailedTxs;
    
    if (successTxs.length === 0 && failedTxs.length === 0) {
      // There's no target for Restake
      await this.unprocesssRound(nowRound);
      return ;
    } else if (successTxs.length > 0) {
      const historyData = restakeMongoDB.makeHistoryData(successTxs, nowRound);
      const historyResult = await this.historiesService.create(historyData);
      const roundData = restakeMongoDB.makeRoundData(historyResult, ScheduleDate().before());
      const roundResult = await this.roundsService.create(roundData);

      const nowStatusData = await this.statusesService.findOne();
      const statusData = restakeMongoDB.makeStatusData(nowStatusData, roundResult, ScheduleDate().next());

      if (nowStatusData === null) {
        const statusResult = await this.statusesService.create(statusData);
      } else {
        const statusResult = await this.statusesService.update(statusData);
      }
    }
  }
}
