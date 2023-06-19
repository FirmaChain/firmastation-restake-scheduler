import { RoundDetail } from "src/rounds/rounds.interface";

export class LatestRoundsDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly roundDetails: RoundDetail[]
}