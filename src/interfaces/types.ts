import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";

import { BroadcastTxResponse } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";
import { RoundsDto } from "src/dtos/rounds.dto";

export class HistoryDetail {
  txHash: string;
  gasUsed: number;
  gasWanted: number;
  height: number;
  dateTime: string;
  rawLog: string;
}

export class RoundDetail {
  txHash: string;
  dateTime: string;
  restakeAmount: number;
  feesAmount: number;
  restakeCount: number;
  retryCount: number;
  reason: number;
  originRestakeTargets: IRestakeTarget[];
  finalRestakeTargets: IRestakeTarget[];
}

export interface IRestakeTarget {
  validatorAddr: string,
  delegatorAddr: string,
  rewards: number
}

export interface IExecuteMessage {
  message: Any,
  restakeTarget: IRestakeTarget
}

export interface ITransactionState {
  errorType: number,
  dateTime: string,
  transactionResult: BroadcastTxResponse,
  retryCount?: number,
  originRestakeTargets?: IRestakeTarget[],
  finalRestakeTargets?: IRestakeTarget[]
}

export interface IWriteDBResult {
  nowRound: number,
  roundsDto: RoundsDto
}