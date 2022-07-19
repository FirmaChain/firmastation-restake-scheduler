import { FirmaWalletService } from '@firmachain/firma-js/dist/sdk/FirmaWalletService';
import { Injectable, OnModuleInit } from '@nestjs/common';

import { IAuthTxData, IRestakeRoundDatas, ITxMessageAndGasData } from '../interfaces/types';
import { BATCH_TX_COUNT } from '../config';
import { spliceAsBatchTxsCount } from '../utils/utils';
import { firmaREStakeInterval } from '../utils/firmaSDK';
import { FirmaSDKHelper } from '../utils/firmaSDKHelper';
import { RoundsService } from '../rounds/rounds.service';
import { HistoriesService } from '../histories/histories.service';
import { StatusesService } from '../statuses/statuses.service';
import { CreateHistoriesDto } from '../dtos/histories.dto';
import { Histories } from '../schemas/histories.schema';
import { CreateRoundsDto } from '../dtos/rounds.dto';
import { IRoundDetail } from '../interfaces/dbTypes';
import { Rounds } from '../schemas/rounds.schema';
import { Statuses } from '../schemas/statuses.schema';
import { StatusesDto } from '../dtos/statuses.dto';

@Injectable()
export class RestakeService implements OnModuleInit {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly statusesService: StatusesService,
    private readonly historiesService: HistoriesService
  ) {}
  
  private firmaSDK = firmaREStakeInterval();
  private restakeWallet: FirmaWalletService;
  private restakeAddress: string;

  async onModuleInit() {
    this.initialize();
  }

  private async initialize() {
    this.restakeWallet = await this.firmaSDK.getREStakeWallet();
    this.restakeAddress = await this.restakeWallet.getAddress();
  }

  async getTxMessageAndGasEstimations(): Promise<ITxMessageAndGasData[]>{
    const validators = await this.firmaSDK.getValidators();
    const notJailedValidators = FirmaSDKHelper().getNotJailedValoperAddresses(validators);
    const grantsList = await this.getGrantsDelegators(notJailedValidators);
    const spliceBatchCountData = spliceAsBatchTxsCount(grantsList, BATCH_TX_COUNT);
    const txMessageAndGasDatas: ITxMessageAndGasData[] = [];

    for (let i = 0; i < spliceBatchCountData.length; i++) {
      const batchTxData = spliceBatchCountData[i];
      const gasEstimation = await this.getGasEstimationValue(batchTxData);

      txMessageAndGasDatas.push({
        gasEstimation: gasEstimation,
        excuteData: spliceBatchCountData[i]
      });
    }

    return txMessageAndGasDatas;
  }

  private async getGrantsDelegators(valoperAddresses: string[]) {
    let retData = [];

    for (let i = 0; i < valoperAddresses.length; i++) {
      const valoperAddress = valoperAddresses[i];

      const delegateList = await this.firmaSDK.getDelegators(valoperAddress);
      const rewardsList = await this.firmaSDK.getPossibleRewardDelegators(delegateList);
      const grantsDataList = await this.firmaSDK.getGrantDelegators(rewardsList, this.restakeAddress, valoperAddress);

      if (grantsDataList.length === 0) {
        continue ;
      }

      const msgs = await this.firmaSDK.getExecuteMsg(grantsDataList, valoperAddress);
      
      if (msgs.length === 0) {
        continue ;
      }

      retData.push(...msgs);
    }

    return retData;
  }

  private async getGasEstimationValue(anyData: any[]): Promise<number> {
    let gasEsitmation: number;
    
    gasEsitmation = await this.firmaSDK.getGasEstimation(this.restakeWallet, anyData);

    return gasEsitmation;
  }

  async executeAllowance(messages: any[], gasEsitmation: number): Promise<IAuthTxData> {
    const txResponseData = await this.firmaSDK.sendAuthzDelegateExecute(this.restakeWallet, messages, gasEsitmation);

    const elem: IAuthTxData = {
      txHash: txResponseData.transactionHash,
      gasUsed: txResponseData['gasUsed'],
      gasWanted: txResponseData['gasWanted'],
      height: txResponseData['height'],
      fees: Number(txResponseData['gasWanted']) * 0.1,
      rawlog: txResponseData.rawLog,
      dateTime: new Date().toISOString()
    }

    return elem;
  }

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

  async saveHistory(txResult: IAuthTxData[]): Promise<Histories> {
    let historyCount: number = await this.historiesService.getCount();
    
    let createHistoriesDto: CreateHistoriesDto = {
      round: historyCount + 1,
      isHasData: txResult.length > 0 ? true : false,
      txInfos: []
    }

    if (createHistoriesDto.isHasData) {
      for (let i = 0 ;i < txResult.length; i++) {
        createHistoriesDto.txInfos.push({
          gasUsed: txResult[i].gasUsed,
          gasWanted: txResult[i].gasWanted,
          height: txResult[i].height,
          txHash: txResult[i].txHash,
          rawlog: txResult[i].rawlog,
          dateTime: txResult[i].dateTime
        });
      }
    }

    return await this.historiesService.create(createHistoriesDto);
  }

  async saveRound(histories: Histories, scheduleStartDate: Date): Promise<Rounds> {
    let round = histories.round;
    let txInfos = histories.txInfos;
    let roundDetails: IRoundDetail[] = [];

    for (let i = 0; i < txInfos.length; i++) {
      const txInfo = txInfos[i];
      const events = JSON.parse(txInfo.rawlog)[0]['events'];

      let txHash: string = txInfo.txHash;
      let fees: number = txInfo.gasWanted * 0.1;
      let dateTime: string = txInfo.dateTime;
      let restake: number = 0;
      let count: number = 0;

      for (let j = 0; j < events.length; j++) {
        const event = events[j];
        const attributes = event['attributes'];

        if (event['type'] !== 'delegate') continue;

        for (let k = 0; k < attributes.length; k++) {
          const attribute = attributes[k];

          if (attribute['key'] !== 'amount') continue;

          const amount = Number(attribute['value'].replace('ufct', ''));

          restake += amount;
          count++;
        }
      }

      roundDetails.push({
        txHash: txHash,
        feesAmount: fees,
        restakeAmount: restake,
        restakeCount: count,
        dateTime: dateTime
      });
    }
    
    let createRoundsDto: CreateRoundsDto = {
      round: round,
      isHasData: roundDetails.length > 0 ? true : false,
      dateTime: scheduleStartDate.toISOString(),
      details: roundDetails
    };

    return await this.roundsService.create(createRoundsDto);
  }

  async saveStatus(rounds: Rounds, scheduleStartDate: Date, nextTimeValue: number) {
    let nowStatus = await this.statusesService.findOne();
    let nextRoundScheduleDate = new Date(scheduleStartDate.setMinutes(scheduleStartDate.getMinutes() + nextTimeValue)).toISOString();

    let status: StatusesDto = {
      nowRound: rounds.round,
      isHasData: rounds.details.length > 0 ? true : false,
      feesAmount: 0,
      restakeAmount: 0,
      restakeCount: 0,
      nextRoundDateTime: nextRoundScheduleDate,
    };

    if (nowStatus === null || nowStatus === undefined) {
      nowStatus = status;
    } else {
      nowStatus.nowRound = rounds.round;
      nowStatus.nextRoundDateTime = nextRoundScheduleDate;
    }

    for (let i = 0; i < rounds.details.length; i++) {
      const round = rounds.details[i];

      nowStatus.feesAmount += round.feesAmount;
      nowStatus.restakeAmount += round.restakeAmount;
      nowStatus.restakeCount += round.restakeCount;
    }

    const statusData = await this.statusesService.findOne();

    if (statusData === null || statusData === undefined) {
      return await this.statusesService.create(nowStatus);
    }

    return await this.statusesService.update(nowStatus);
  }
}
