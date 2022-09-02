import { RoundDetail } from "src/interfaces/types";

export class LatestRoundsDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly roundDetails: RoundDetail[]
}