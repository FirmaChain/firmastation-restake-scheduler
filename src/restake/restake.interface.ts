
import { Any } from '@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any';
import { BroadcastTxResponse } from '@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient';

export interface Target {
  validatorAddress: string,
  delegatorAddress: string,
  rewards?: number
}

export interface RestakeMessage {
  message: Any,
  target: {
    validatorAddress: string,
    delegatorAddress: string,
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