import { Controller, Get, Param } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { IAuthTxData, IFreequancy, IRestakeInfo, IRestakeStatusData } from '../interfaces/types';
import { RestakeService } from './restake.service';;
import { convertFreequancy } from 'src/utils/utils';
import { FREEQUANCY, MINIMUM_UFCT_REWARD_AMOUNT } from 'src/config';

const freequancyInfo: IFreequancy = convertFreequancy(FREEQUANCY);

@Controller('restake')
export class RestakeController {
  constructor(private readonly restakeService: RestakeService) {
  }

  @Cron(freequancyInfo.cronExpression, {
    name: 'restake',
    timeZone: 'Europe/London'
  })
  private async restakeHandleCron() {
    let scheduleStartDate = new Date();
    let executeResult: IAuthTxData[] = [];
    let isProgressCalcGas = true;

    console.log(`Start scheduler : ${scheduleStartDate}`);
    console.log(`Start scheduler(ISO String) : ${scheduleStartDate.toISOString()}`);

    while (isProgressCalcGas) {
      try {
        let txMsgAndGasDatas = await this.restakeService.getTxMessageAndGasEstimations();

        if (txMsgAndGasDatas.length > 0) {
          for (let i = 0; i < txMsgAndGasDatas.length; i++) {
            const msgAndGasData = txMsgAndGasDatas[i];
            const result = await this.restakeService.executeAllowance(msgAndGasData.excuteData, msgAndGasData.gasEstimation);
            executeResult.push(result);
          }
        }

        isProgressCalcGas = false;
      } catch (e) {
        console.log(e);
        continue ;
      }
    }

    this.restakeResultHandleInDB(executeResult, scheduleStartDate);
  }

  private async restakeResultHandleInDB(authTxDatas: IAuthTxData[], scheduleStartDate: Date) {
    const saveHistoryResult = await this.restakeService.saveHistory(authTxDatas);
    const saveRoundResult = await this.restakeService.saveRound(saveHistoryResult, scheduleStartDate);
    const updateStatusResult = await this.restakeService.saveStatus(saveRoundResult, scheduleStartDate, freequancyInfo.nextTimeValue);
  }

  @Get('info')
  async getRestakeInfo() {
    const latestRoundData = await this.restakeService.getLatestRound();
    const statusData = await this.restakeService.getRoundStatus();

    const expiryDate = new Date();
		expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    let retData: IRestakeInfo = {
      freequancy: FREEQUANCY,
      minimumRewards: MINIMUM_UFCT_REWARD_AMOUNT,
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
