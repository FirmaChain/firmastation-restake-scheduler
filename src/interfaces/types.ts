import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";

import { BroadcastTxResponse } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";
import { CreateRoundsDto } from "src/dtos/rounds.dto";

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
  roundsDto: CreateRoundsDto
}