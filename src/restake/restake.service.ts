import { Injectable } from '@nestjs/common';

import { IRestakeInfo, IRestakeRoundData, IRoundDetail } from '../interfaces/types';
import { RoundsService } from '../rounds/rounds.service';
import { StatusesService } from '../statuses/statuses.service';
import { MINIMUM_UFCT_REWARD_AMOUNT, RESTAKE_FREQUENCY } from '../config';
import { ScheduleDate } from '../utils/scheduleDate';

@Injectable()
export class RestakeService {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly statusesService: StatusesService
  ) {}
  
  async getRestakeInfoForStationApp(): Promise<IRestakeInfo> {
    let frequency = RESTAKE_FREQUENCY;
    let minimumRewards = MINIMUM_UFCT_REWARD_AMOUNT;
    let round = 1;
    let feesAmount = 0;
    let restakeAmount = 0;
    let restakeCount = 0;
    let nextRoundDateTime = ScheduleDate().next();

    const latestData = await this.roundsService.findLatest();

    if (latestData !== null) {
      round = latestData.round;
      const roundDetails = latestData.roundDetails;

      for (let i = 0; i < roundDetails.length; i++) {
        const roundDetail = roundDetails[i];
        
        feesAmount += roundDetail.feesAmount;
        restakeAmount += roundDetail.restakeAmount;
        restakeCount += roundDetail.restakeCount;
      }
    }
    
    return {
      frequency: frequency,
      minimumRewards: minimumRewards,
      round: round,
      feesAmount: feesAmount.toString(),
      restakeAmount: restakeAmount.toString(),
      restakeCount: restakeCount,
      nextRoundDateTime: nextRoundDateTime
    };
  }

  async getRestakeInfoForRestakeWeb(count: number) {
    let round = 0;
    let feesAmount = 0;
    let restakeAmount = 0;
    let restakeCount = 0;
    let restakeAvgTime = 0;
    let roundDatas = [];
    let nextRoundDateTime = ScheduleDate().next();
  
    // Status Data
    const statusData = await this.statusesService.findOne();
    
    if (statusData !== null) {
      round = statusData.nowRound;
      feesAmount = statusData.feesAmount;
      restakeAmount = statusData.restakeAmount;
      restakeCount = statusData.restakeCount;
    }

    let totalCount = count;
    if (totalCount === 0) {
      totalCount = await this.roundsService.count();
    }

    // Round Data
    const rounds = await this.roundsService.findLatestAt(totalCount);
    if (rounds.length !== 0) {
      let restakeTotalTime = 0;

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];

        let roundFeesAmount: number = 0;
        let roundRestakeAmount: number = 0;
        let roundRestakeCount: number = 0;
        let roundRestakeTotalTime: number = 0;
        let roundDetails: IRoundDetail[] = [];
        
        for (let j = 0; j < round.roundDetails.length; j++) {
          const roundDetail = round.roundDetails[j];
          if (roundDetail.reason === 0) {
            roundFeesAmount += roundDetail.feesAmount;
            roundRestakeAmount += roundDetail.restakeAmount;
            roundRestakeCount += roundDetail.restakeCount;

            roundDetails.push({
              feesAmount: roundDetail.feesAmount,
              restakeAmount: roundDetail.restakeAmount,
              restakeCount: roundDetail.restakeCount,
              dateTime: roundDetail.dateTime,
              txHash: roundDetail.txHash
            });
          }
        }

        const roundDetailCount = round.roundDetails.length;
        if (roundDetailCount > 0) {
          const roundLength = roundDetailCount - 1;
          const startDateTime = (new Date(round.scheduleDate)).getTime();
          const endDateTime = (new Date(round.roundDetails[roundLength].dateTime)).getTime();
          roundRestakeTotalTime = (endDateTime - startDateTime) / 1000;

          if (i < 10) {
            restakeTotalTime += roundRestakeTotalTime;
          }
        }
  
        const data: IRestakeRoundData = {
          round: round.round,
          feesAmount: roundFeesAmount,
          restakeAmount: roundRestakeAmount,
          restakeCount: roundRestakeCount,
          startDateTime: round.scheduleDate,
          retakeTotalTime: roundRestakeTotalTime,
          roundDetails: roundDetails
        }
  
        roundDatas.push(data);
      }

      restakeAvgTime = restakeTotalTime / rounds.length;
    }

    return {
      round: round,
      feesAmount: feesAmount,
      restakeAmount: restakeAmount,
      restakeCount: restakeCount,
      restakeAvgTime: restakeAvgTime,
      nextRoundDateTime: nextRoundDateTime,
      roundDatas: roundDatas,
    };
  }
}
