import { Injectable } from '@nestjs/common';

import { IRestakeRoundDatas } from '../interfaces/types';
import { RoundsService } from '../rounds/rounds.service';
import { StatusesService } from '../statuses/statuses.service';
import { Rounds } from '../schemas/rounds.schema';
import { Statuses } from '../schemas/statuses.schema';

@Injectable()
export class RestakeService {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly statusesService: StatusesService
  ) {}
  
  async getRoundStatus(): Promise<Statuses> {
    return await this.statusesService.findOne();
  }

  async getLatestRound() {
    const latestData = await this.roundsService.findLatest();
    const roundDetails = latestData.details;
    
    let totalFeesAmount = 0;
    let totalRestakeAmount = 0;
    let totalRestakeCount = 0;

    for (let i = 0; i < roundDetails.length; i++) {
      const roundDetail = roundDetails[i];
      
      totalFeesAmount += roundDetail.feesAmount;
      totalRestakeAmount += roundDetail.restakeAmount;
      totalRestakeCount += roundDetail.restakeCount;
    }

    return {
      round: latestData.round,
      feesAmount: totalFeesAmount,
      restakeAmount: totalRestakeAmount,
      restakeCount: totalRestakeCount
    };
  }

  async getLatestAtRound(count: number): Promise<IRestakeRoundDatas[]> {
    const roundsData: Rounds[] = await this.roundsService.findLatestAt(count);
    let retData: IRestakeRoundDatas[] = [];

    for (let i = 0; i < roundsData.length; i++) {
      const round = roundsData[i];

      let roundRestakeAmount: number = 0;
      let roundFeesAmount: number = 0;
      let roundRestakeCount: number = 0;

      for (let j = 0; j < round.details.length; j++) {
        const roundDetail = round.details[j];

        roundRestakeAmount += roundDetail.restakeAmount;
        roundFeesAmount += roundDetail.feesAmount;
        roundRestakeCount += roundDetail.restakeCount;
      }

      const elemData: IRestakeRoundDatas = {
        round: round.round,
        restakeAmount: roundRestakeAmount,
        feesAmount: roundFeesAmount,
        restakeCount: roundRestakeCount,
        roundDetails: round.details
      }

      retData.push(elemData);
    }

    return retData;
  }
}
