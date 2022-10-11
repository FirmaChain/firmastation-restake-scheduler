import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduleDate } from '../utils/scheduleDate';

import { HistoriesService } from '../histories/histories.service';
import { RoundsService } from '../rounds/rounds.service';
import { StatusesService } from '../statuses/statuses.service';
import { RestakeMongoDB } from '../utils/mongoDB';
import { RestakeSDK } from 'src/utils/restakeSDK';
import { ITransactionState, IWriteDBResult } from 'src/interfaces/types';
import { sendRestakeFailedResultMessage, sendRestakeResultMessage } from 'src/components/telegram';
import { ERROR_CALC_GAS, ERROR_EXECUTE_MESSAGE, ERROR_INSUFFICIENT, ERROR_NONE } from 'src/constants/errorType';
import { RETRY_COUNT } from 'src/config';
import { LatestRoundsService } from 'src/latest-rounds/latest-rounds.service';

@Injectable()
export class SchedulerServiceService {
  constructor(
    private readonly historiesService: HistoriesService,
    private readonly roundsService: RoundsService,
    private readonly statusesService: StatusesService,
    private readonly latestRoundsService: LatestRoundsService
  ) {
    
  }

  @Cron(CronExpression.EVERY_4_HOURS, {
    name: 'restake_handling',
    timeZone: 'Etc/UTC'
  })
  async handleCron() {
    // Schedule Date
    const scheduleDate = new Date().toISOString();
    // restake
    const restakeExecuteResults = await this.restakeProcess();
    const writeDBResult = await this.writeDBProcess(restakeExecuteResults, scheduleDate);
    const sendTelegramResult = await this.sendTelegram(writeDBResult);
  }

  private async restakeProcess() {
    // restake flow
    try {
      const restakeSDK = await RestakeSDK();
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

      return successTransactionStates;
    } catch (e) {
      console.log(e);
      const transactionStates: ITransactionState[] = [];
      return transactionStates;
    }
  }

  private async writeDBProcess(restakeExecuteResults: ITransactionState[], scheduleDate: string) {
    const restakeMongoDB = RestakeMongoDB();
    const nowRound = await this.historiesService.count() + 1;
    const nowScheduleDate = scheduleDate;

    if (restakeExecuteResults.length === 0) {
      await this.unprocessRound(nowRound, nowScheduleDate);
      
      return {
        nowRound: nowRound,
        roundsDto: {
          round: nowRound,
          scheduleDate: nowScheduleDate,
          roundDetails: []
        }
      }
    }

    const parseRestakeData = restakeMongoDB.parsingRestakeTransactions(nowRound, restakeExecuteResults, scheduleDate);
    const historyDto = parseRestakeData.historyDto;
    const roundDto = parseRestakeData.roundDto;

    await this.historiesService.create(historyDto);
    await this.roundsService.create(roundDto);
    await this.latestRoundsService.createAndUpdate(roundDto);

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
    const nextScheduleDate = ScheduleDate().next();

    if (statusData === null) {
      await this.statusesService.create({
        nowRound: nowRound,
        nextRoundDateTime: nextScheduleDate,
        feesAmount: feesAmount,
        restakeAmount: restakeAmount,
        restakeCount: restakeCount
      });
    } else {
      feesAmount += statusData.feesAmount;
      restakeAmount += statusData.restakeAmount;
      restakeCount += statusData.restakeCount;

      await this.statusesService.update({
        nowRound: nowRound,
        nextRoundDateTime: nextScheduleDate,
        feesAmount: feesAmount,
        restakeAmount: restakeAmount,
        restakeCount: restakeCount
      });
    }

    return {
      nowRound: nowRound,
      roundsDto: roundDto
    }
  }

  private async unprocessRound(round: number, nowScheduleDate: string) {
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

    await this.latestRoundsService.createAndUpdate({
      round: round,
      scheduleDate: nowScheduleDate,
      roundDetails: []
    });

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

  private async sendTelegram(writeDBResult: IWriteDBResult) {
    let successCount = 0;
    let failedCount = 0;
    let resultMsg = `[ ● RESTAKE ● ]\nROUND: ${writeDBResult.nowRound}\n`;
    let failedMsg = '[ ● ERRORS ● ]\n';

    const roundDetails = writeDBResult.roundsDto.roundDetails;
    if (roundDetails.length > 0) {
      for (let i = 0; i < roundDetails.length; i++) {
        const roundDetail = roundDetails[i];

        if (roundDetail.reason === ERROR_NONE) {
          successCount++;
        } else {
          failedCount++;

          failedMsg += `[ ■ STEP ${i + 1} ■ ]\n`;

          switch (roundDetail.reason) {
            case ERROR_CALC_GAS:
              failedMsg += 'SUCCESS: calc gas\n';
              break;
            case ERROR_INSUFFICIENT:
              failedMsg += 'SUCCESS: insufficient\n';
              break;
            case ERROR_EXECUTE_MESSAGE:
              failedMsg += 'SUCCESS: execute\n';
              break;
          }

          failedMsg += `RETRY: ${roundDetail.retryCount} / ${RETRY_COUNT}\n`;
        }
      }
      failedMsg += '\n'
      resultMsg += `SUCCESS: ${successCount}\n`;
      resultMsg += `FAILED: ${failedCount}\n`;
    } else {
      resultMsg += 'not found targets';
    }

    // send result message
    await sendRestakeResultMessage(resultMsg);

    // send failed message
    if (failedCount === 0 && successCount === 0) {
      failedMsg += "Not process restake(Time out lcd)";
      await sendRestakeFailedResultMessage(failedMsg);
    } else if (failedCount > 0) {
      await sendRestakeFailedResultMessage(failedMsg);
    }
  }
}
