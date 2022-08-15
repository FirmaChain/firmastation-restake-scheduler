export class CreateHistoriesDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly historyDetails: HistoryDetail[];
}

export class HistoryDetail {
  txHash: string;
  gasUsed: number;
  gasWanted: number;
  height: number;
  dateTime: string;
  rawLog: string;
}