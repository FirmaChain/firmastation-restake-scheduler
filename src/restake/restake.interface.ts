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
  transactionResult: DeliverTxResponse;
  retryCount: number;
  originRestakeTargets: Target[];
  finalRestakeTargets: Target[];
}

export interface DeliverTxResponse {
  readonly height: number;
  /** The position of the transaction within the block. This is a 0-based index. */
  readonly txIndex: number;
  /** Error code. The transaction suceeded if and only if code is 0. */
  readonly code: number;
  readonly transactionHash: string;
  readonly events: readonly Event[];
  /**
   * The message responses extracted from events.
   * This field contains structured message response data parsed from transaction events.
   */
  readonly msgResponses: Array<{
    readonly typeUrl: string;
    readonly value: Uint8Array;
  }>;
  readonly gasUsed: bigint;
  readonly gasWanted: bigint;
}

export interface Attribute {
  readonly key: string;
  readonly value: string;
}

export interface Event {
  readonly type: string;
  readonly attributes: readonly Attribute[];
}
