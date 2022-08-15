import { Injectable } from '@nestjs/common';

import { IRestakeInfo, IRestakeRoundData } from '../interfaces/types';
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

    // Round Data
    const rounds = await this.roundsService.findLatestAt(count);

    if (rounds.length !== 0) {
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];

        let roundFeesAmount: number = 0;
        let roundRestakeAmount: number = 0;
        let roundRestakeCount: number = 0;

        for (let j = 0; j < round.roundDetails.length; j++) {
          const roundDetail = round.roundDetails[j];
  
          roundFeesAmount += roundDetail.feesAmount;
          roundRestakeAmount += roundDetail.restakeAmount;
          roundRestakeCount += roundDetail.restakeCount;
        }
  
        const data: IRestakeRoundData = {
          round: round.round,
          feesAmount: roundFeesAmount,
          restakeAmount: roundRestakeAmount,
          restakeCount: roundRestakeCount,
          startDateTime: round.scheduleDate,
          roundDetails: round.roundDetails
        }
  
        roundDatas.push(data);
      }
    }

    return {
      round: round,
      feesAmount: feesAmount,
      restakeAmount: restakeAmount,
      restakeCount: restakeCount,
      nextRoundDateTime: nextRoundDateTime,
      roundDatas: roundDatas
    };
  }
}
