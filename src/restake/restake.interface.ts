
import { Any } from '@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any';
import { BroadcastTxResponse } from '@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient';

export interface Target {
  validatorAddr: string,
  delegatorAddr: string,
  rewards?: number
}

export interface RestakeMessage {
  message: Any,
  target: {
    validatorAddr: string,
    delegatorAddr: string,
    rewards: number,
  }
}

export interface TransactionResult {
  errorType: number,
  dateTime: string,
  transactionResult: BroadcastTxResponse,
  retryCount: number,
  originRestakeTargets: Target[],
  finalRestakeTargets: Target[]
}