import { CreateHistoriesDto, HistoryDetail } from "src/dtos/histories.dto";
import { CreateRoundsDto, RoundDetail } from "src/dtos/rounds.dto";
import { ITransactionState } from "src/interfaces/types"
import { RestakeSDKHelper } from "./restakeSDKHelper";
import { ScheduleDate } from "./scheduleDate";

const RestakeMongoDB = () => {
  const parsingRestakeTransactions = (nowRound: number, restakeExecuteResults: ITransactionState[]) => {
    let scheduleDate = ScheduleDate().before();

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

  const getCreateHistoryDataToSave = (nowRound: number, restakeExecuteResults: ITransactionState[]) => {
    let historyDetails: HistoryDetail[] = [];

    for (let i = 0; i < restakeExecuteResults.length; i++) {
      let restakeExecuteResult = restakeExecuteResults[i];

      let dateTime = restakeExecuteResult.dateTime;
      let txResult = restakeExecuteResult.transactionResult;

      let historyDetail: HistoryDetail = new HistoryDetail();

      if (txResult !== null) {
        historyDetail = {
          txHash: txResult.transactionHash,
          dateTime: dateTime,
          gasUsed: txResult['gasUsed'],
          gasWanted: txResult['gasWanted'],
          height: txResult.height,
          rawLog: txResult.rawLog
        }
      }

      historyDetails.push(historyDetail);
    }

    const historyDto: CreateHistoriesDto = {
      round: nowRound,
      scheduleDate: ScheduleDate().before(),
      historyDetails: historyDetails
    }

    return historyDto;
  }

  const getCreateRoundDataToSave = () => {

  }

  const getCreateStatusDataToSave = () => {

  }

  return {
    getCreateHistoryDataToSave,
    getCreateRoundDataToSave,
    getCreateStatusDataToSave,
    parsingRestakeTransactions
  }
}

export { RestakeMongoDB }