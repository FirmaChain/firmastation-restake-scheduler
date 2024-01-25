import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { TransactionResult } from 'src/restake/restake.interface';
import { RoundDetail } from 'src/rounds/rounds.interface';
import { RoundsService } from 'src/rounds/rounds.service';
import { LatestRoundsService } from 'src/latest-rounds/latest-rounds.service';
import { StatusesService } from 'src/statuses/statuses.service';
import { NextScheduleDate } from 'src/utils/scheduleDate.util';

@Injectable()
export class MongoDbService {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly latestRoundsService: LatestRoundsService,
    private readonly statusesService: StatusesService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {

  }

  async saveDB(transactionResults: TransactionResult[], scheduleDate: string) {
    let nowRound = 0;
    try {
      nowRound = await this.roundsService.count() + 1;
      
      if (transactionResults.length === 0) {
        return {
          message: `Unprocess round`,
          round: nowRound,
          data: []
        }
      } else {
        return {
          message: ``,
          round: nowRound,
          data: await this.saveRoundData(transactionResults, nowRound, scheduleDate)
        }
      }
    } catch (e) {
      const message = `❌ Failed save db data`;
      this.logger.error(`${message} : ${e}`);
      return {
        message,
        round: nowRound,
        data: []
      }
    }
  }
 
  async saveRoundData(transactionResults: TransactionResult[], round: number, scheduleDate: string) {
    const roundDetails = this.parseTransactionResults(transactionResults);

    await this.roundsService.create({ round, roundDetails, scheduleDate });
    await this.latestRoundsService.createAndUpdate({ round, roundDetails, scheduleDate });

    let restakeAmount = 0;
    let feesAmount = 0;
    let restakeCount = 0;

    for (let i = 0; i < roundDetails.length; i++) {
      const roundDetail = roundDetails[i];
      restakeAmount += roundDetail.restakeAmount;
      feesAmount += roundDetail.feesAmount;
      restakeCount += roundDetail.restakeCount;
    }

    const statusData = await this.statusesService.findOne();
    const nextScheduleDate = NextScheduleDate();

    if (statusData === null) {
      await this.statusesService.create({
        nowRound: round,
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
        nowRound: round,
        nextRoundDateTime: nextScheduleDate,
        feesAmount: feesAmount,
        restakeAmount: restakeAmount,
        restakeCount: restakeCount
      });
    }

    return roundDetails;
  }

  private parseTransactionResults(transactionResults: TransactionResult[]) {
    let roundDetails: RoundDetail[] = [];
    
    transactionResults.forEach((elem) => {
      const transactionResult = elem.transactionResult;

      let txHash = '';
      let gasWanted = 0;
      let rawLog = '';
      let fees = 0;

      if (transactionResult !== null) {
        txHash = transactionResult.transactionHash;
        gasWanted = transactionResult['gasWanted'];
        rawLog = transactionResult.rawLog;
        fees = gasWanted * 0.1;
      }

      let parseRawLog = this.parseRawLog(rawLog);
      let restakeAmount = parseRawLog.restakeAmount;
      let restakeCount = parseRawLog.restakeCount;

      roundDetails.push({
        txHash: txHash,
        dateTime: elem.dateTime,
        restakeAmount: restakeAmount,
        feesAmount: fees,
        restakeCount: restakeCount,
        reason: elem.errorType,
        originRestakeTargets: elem.originRestakeTargets,
        finalRestakeTargets: elem.finalRestakeTargets,
        retryCount: elem.retryCount
      });
    });

    return roundDetails;
  }

  private parseRawLog(rawLog: string) {
    let restakeAmount = 0;
    let restakeCount = 0;

    try {
      const events = JSON.parse(rawLog)[0]['events'];
      for (let j = 0; j < events.length; j++) {
        const event = events[j];
        const attributes = event['attributes'];
  
        if (event['type'] !== 'delegate') continue;
  
        for (let k = 0; k < attributes.length; k++) {
          const attribute = attributes[k];
  
          if (attribute['key'] !== 'amount') continue;
  
          const amount = Number(attribute['value'].replace('ufct', ''));
  
          restakeAmount += amount;
          restakeCount++;
        }

        return {
          restakeAmount,
          restakeCount
        }
      }
    } catch (e) {
      console.log(`Data does not exist.`);

      return {
        restakeAmount,
        restakeCount
      }
    }
  }
}
