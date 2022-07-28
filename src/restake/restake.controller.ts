import { Controller, Get, Param } from '@nestjs/common';

import { IRestakeInfo, IRestakeStatusData } from '../interfaces/types';
import { RestakeService } from './restake.service';;

@Controller('restake')
export class RestakeController {
  constructor(private readonly restakeService: RestakeService) {
  }

  @Get('info')
  async getRestakeInfo() {
    const latestRoundData = await this.restakeService.getLatestRound();
    const statusData = await this.restakeService.getRoundStatus();

    const expiryDate = new Date();
		expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    let retData: IRestakeInfo = {
      frequency: '4 hour',
      minimumRewards: 10000000,
      round: latestRoundData.round,
      restakeAmount: latestRoundData.restakeAmount.toString(),
      feesAmount: latestRoundData.feesAmount.toString(),
      userMsgCount: latestRoundData.restakeCount,
      nextRoundDateTime: statusData.nextRoundDateTime,
      expiryDate: expiryDate.toISOString()
    }

    return retData;
  }

  @Get('status/:count')
  async getRestakeWebStatus(@Param('count') count: number) {
    const statusData = await this.restakeService.getRoundStatus();
    const roundDatas = await this.restakeService.getLatestAtRound(count);
    
    const retData: IRestakeStatusData = {
      round: statusData.nowRound,
      restakeAmount: statusData.restakeAmount,
      feesAmount: statusData.feesAmount,
      restakeCount: statusData.restakeCount,
      nextRoundDateTime: statusData.nextRoundDateTime,
      roundDatas: roundDatas
    }

    return retData;
  }
}
