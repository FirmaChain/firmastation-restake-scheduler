export interface ITxCountInfo {
  totalTxCount: number,
  successTxCount: number,
  failedTxCount: number,
}

export interface IRoundDetail {
  feesAmount: number;
  restakeAmount: number;
  restakeCount: number;
  dateTime: string;
  txHash: string;
}