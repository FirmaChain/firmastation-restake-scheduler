import { Any } from '@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any';

export interface Target {
  validatorAddr: string;
  delegatorAddr: string;
  rewards?: number;
}

export interface RestakeMessage {
  message: Any;
  target: {
    validatorAddr: string;
    delegatorAddr: string;
    rewards: number;
  };
}

export interface TransactionResult {
  errorType: number;
  dateTime: string;
  transactionResult: any;
  retryCount: number;
  originRestakeTargets: Target[];
  finalRestakeTargets: Target[];
}
