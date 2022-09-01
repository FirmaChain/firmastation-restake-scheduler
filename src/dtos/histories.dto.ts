import { HistoryDetail } from "src/interfaces/types";

export class HistoriesDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly historyDetails: HistoryDetail[];
}