import { BroadcastTxSuccess } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient"

import { CreateRoundsDto } from "../dtos/rounds.dto";
import { StatusesDto } from "../dtos/statuses.dto";
import { IRoundDetail } from "../interfaces/dbTypes";
import { Histories } from "../schemas/histories.schema";
import { Rounds } from "../schemas/rounds.schema";
import { Statuses } from "../schemas/statuses.schema";
import { CreateHistoriesDto, TxInfoDto } from "../dtos/histories.dto"

const RestakeMongoDB = () => {
  const makeHistoryData = (txResults: BroadcastTxSuccess[], roundCount: number): CreateHistoriesDto => {
    let txInfoDtos: TxInfoDto[] = [];
    let isHasData: boolean = txResults.length > 0 ? true : false;

    for (let i = 0; i < txResults.length; i++) {
      const txResult: BroadcastTxSuccess = txResults[i];
      const txInfo: TxInfoDto = {
        gasUsed: txResult.gasUsed,
        gasWanted: txResult.gasWanted,
        height: txResult.height,
        txHash: txResult.transactionHash,
        rawlog: txResult.rawLog,
        dateTime: new Date().toISOString()
      }

      txInfoDtos.push(txInfo);
    }

    return {
      round: roundCount + 1,
      isHasData: isHasData,
      txInfos: txInfoDtos
    };
  }

  const makeRoundData = (histories: Histories, scheduleStartDate: Date): CreateRoundsDto => {
    let txInfos = histories.txInfos;
    let roundDetails: IRoundDetail[] = [];

    for (let i = 0; i < txInfos.length; i++) {
      const txInfo = txInfos[i];
      const events = JSON.parse(txInfo.rawlog)[0]['events'];
      const txHash: string = txInfo.txHash;
      const fees: number = txInfo.gasWanted * 0.1;
      const dateTime: string = txInfo.dateTime;
      let restakeAmount: number = 0;
      let restakeCount: number = 0;

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
      }

      roundDetails.push({
        txHash: txHash,
        feesAmount: fees,
        restakeAmount: restakeAmount,
        restakeCount: restakeCount,
        dateTime: dateTime
      });
    }

    return {
      round: histories.round,
      isHasData: histories.isHasData,
      dateTime: scheduleStartDate.toISOString(),
      details: roundDetails
    };
  }

  const makeStatusData = (nowStatusData: Statuses, rounds: Rounds, nextScheduleDate: string): StatusesDto => {
    let feesAmount: number = 0;
    let restakeAmount: number = 0;
    let restakeCount: number = 0;

    if (nowStatusData !== null && nowStatusData !== undefined) {
      feesAmount = nowStatusData.feesAmount;
      restakeAmount = nowStatusData.restakeAmount;
      restakeCount = nowStatusData.restakeCount;
    }

    for (let i = 0; i < rounds.details.length; i++) {
      const detail = rounds.details[i];

      feesAmount += detail.feesAmount;
      restakeAmount += detail.restakeAmount;
      restakeCount += detail.restakeCount;
    }
    
    return {
      nowRound: rounds.round,
      feesAmount: feesAmount,
      restakeAmount: restakeAmount,
      restakeCount: restakeCount,
      nextRoundDateTime: nextScheduleDate
    }
  }

  return {
    makeHistoryData,
    makeRoundData,
    makeStatusData
  }
}

export { RestakeMongoDB }