import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduleDate } from '../utils/scheduleDate';

import { HistoriesService } from '../histories/histories.service';
import { RoundsService } from '../rounds/rounds.service';
import { StatusesService } from '../statuses/statuses.service';
import { RestakeMongoDB } from '../utils/mongoDB';
import { RestakeSDK } from 'src/utils/restakeSDK';
import { ITransactionState } from 'src/interfaces/types';
import { StatusesDto } from 'src/dtos/statuses.dto';

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
    const restakeExecuteResults = await this.restakeProcess();
    await this.writeDBProcess(restakeExecuteResults.successTransactionStates, restakeExecuteResults.scheduleDate);
  }

  async restakeProcess() {
    // Schedule Date
    const scheduleDate = new Date().toISOString();

    // restake flow
    const restakeSDK = await RestakeSDK(false);
    const restakeTargets = await restakeSDK.getRestakeTargets();
    const restakeMessages = await restakeSDK.getRestakeMessages(restakeTargets);
    const restakeExecuteResults = await restakeSDK.executeAllowanceMessages(restakeMessages);

    // retry flow
    let successTransactionStates = restakeExecuteResults.successTransactionStates;
    let retryRestakeTargets = restakeExecuteResults.retryRestakeTargets;

    if (retryRestakeTargets.length > 0) {
      const retryRestakeExecuteResults = await restakeSDK.retryExecuteAllowanceMessages(retryRestakeTargets);
      successTransactionStates.push(...retryRestakeExecuteResults);
    }

    return {
      successTransactionStates,
      scheduleDate
    }
  }

  async writeDBProcess(restakeExecuteResults: ITransactionState[], scheduleDate: string) {
    const restakeMongoDB = RestakeMongoDB();
    const nowRound = await this.historiesService.count() + 1;
    const nowScheduleDate = scheduleDate;

    if (restakeExecuteResults.length === 0) {
      this.unprocesssRound(nowRound, nowScheduleDate);
      return ;
    }

    const parseRestakeData = restakeMongoDB.parsingRestakeTransactions(nowRound, restakeExecuteResults, scheduleDate);
    const historyDto = parseRestakeData.historyDto;
    const roundDto = parseRestakeData.roundDto;

    await this.historiesService.create(historyDto);
    await this.roundsService.create(roundDto);

    let restakeAmount = 0;
    let feesAmount = 0;
    let restakeCount = 0;

    for (let i = 0; i < roundDto.roundDetails.length; i++) {
      const roundDetail = roundDto.roundDetails[i];
      restakeAmount += roundDetail.restakeAmount;
      feesAmount += roundDetail.feesAmount;
      restakeCount += roundDetail.restakeCount;
    }

    const statusData = await this.statusesService.findOne();
    
    let statusDto: StatusesDto = {
      nowRound: nowRound,
      nextRoundDateTime: ScheduleDate().next(),
      feesAmount: statusData.feesAmount + feesAmount,
      restakeAmount: statusData.restakeAmount + restakeAmount,
      restakeCount: statusData.restakeCount + restakeCount
    }

    await this.statusesService.update(statusDto);
  }

  async unprocesssRound(round: number, nowScheduleDate: string) {
    // Create history data
    await this.historiesService.create({
      round: round,
      scheduleDate: nowScheduleDate,
      historyDetails: []
    });
    // Create round data
    await this.roundsService.create({
      round: round,
      scheduleDate: nowScheduleDate,
      roundDetails: []
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
}
