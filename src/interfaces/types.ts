import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";

import { BroadcastTxResponse } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";

export interface IRestakeInfo {
  frequency: string,
  minimumRewards: number,
  round: number,
  feesAmount: string,
  restakeAmount: string,
  restakeCount: number,
  nextRoundDateTime: string
}

export interface IRoundDetail {
  feesAmount: number;
  restakeAmount: number;
  restakeCount: number;
  dateTime: string;
  txHash: string;
}

export interface IRestakeRoundData {
  round: number,
  restakeAmount: number,
  feesAmount: number,
  restakeCount: number,
  startDateTime: string,
  retakeTotalTime: number,
  roundDetails: IRoundDetail[]
}

export interface IRestakeTarget {
  validatorAddr: string,
  delegatorAddr: string
}

export interface IExecuteMessage {
  message: Any,
  restakeTarget: IRestakeTarget
}

export interface ITransactionData {
  txHash: string,
}

export interface ITransactionState {
  errorType: number,
  dateTime: string,
  transactionResult: BroadcastTxResponse,
  retryCount?: number,
  originRestakeTargets?: IRestakeTarget[],
  finalRestakeTargets?: IRestakeTarget[]
}