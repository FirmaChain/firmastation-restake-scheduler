import { RoundDetail } from "src/interfaces/types";

export class RoundsDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly roundDetails: RoundDetail[]
}