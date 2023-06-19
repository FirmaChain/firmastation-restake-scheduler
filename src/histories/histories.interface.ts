export class HistoryDetail {
  txHash: string;
  gasUsed: number;
  gasWanted: number;
  height: number;
  dateTime: string;
  rawLog: string;
}

export class HistoriesDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly historyDetails: HistoryDetail[];
}