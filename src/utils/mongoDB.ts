import { CreateHistoriesDto, HistoryDetail } from "src/dtos/histories.dto";
import { CreateRoundsDto, RoundDetail } from "src/dtos/rounds.dto";
import { ITransactionState } from "src/interfaces/types"
import { RestakeSDKHelper } from "./restakeSDKHelper";

const RestakeMongoDB = () => {
  const parsingRestakeTransactions = (nowRound: number, restakeExecuteResults: ITransactionState[], scheduleDate: string) => {
    let historyDetails: HistoryDetail[] = [];
    let roundDetails: RoundDetail[] = [];

    for (let i = 0; i < restakeExecuteResults.length; i++) {
      let restakeExecuteResult = restakeExecuteResults[i];
      let transactionResult = restakeExecuteResult.transactionResult;
      
      let txHash = '';
      let gasUsed = 0;
      let gasWanted = 0;
      let height = 0;
      let rawLog = '';
      let fees = 0;

      if (transactionResult !== null) {
        txHash = transactionResult.transactionHash;
        gasUsed = transactionResult['gasUsed'];
        gasWanted = transactionResult['gasWanted'];
        height = transactionResult.height;
        rawLog = transactionResult.rawLog;
        fees = gasWanted * 0.1;
      }

      let dateTime = restakeExecuteResult.dateTime;
      let parseRawLog = RestakeSDKHelper().parseRawLog(rawLog);
      let restakeAmount = parseRawLog.restakeAmount;
      let restakeCount = parseRawLog.restakeCount;

      historyDetails.push({
        txHash: txHash,
        gasUsed: gasUsed,
        gasWanted: gasWanted,
        height: height,
        rawLog: rawLog,
        dateTime: dateTime
      });

      roundDetails.push({
        txHash: txHash,
        dateTime: restakeExecuteResult.dateTime,
        restakeAmount: restakeAmount,
        feesAmount: fees,
        restakeCount: restakeCount,
        reason: restakeExecuteResult.errorType,
        originRestakeTargets: restakeExecuteResult.originRestakeTargets,
        finalRestakeTargets: restakeExecuteResult.finalRestakeTargets,
        retryCount: restakeExecuteResult.retryCount
      });
    }

    const historyDto: CreateHistoriesDto = {
      round: nowRound,
      scheduleDate: scheduleDate,
      historyDetails: historyDetails
    }

    const roundDto: CreateRoundsDto = {
      round: nowRound,
      scheduleDate: scheduleDate,
      roundDetails: roundDetails
    }

    return {
      historyDto,
      roundDto
    }
  }

  return {
    parsingRestakeTransactions
  }
}

export { RestakeMongoDB }