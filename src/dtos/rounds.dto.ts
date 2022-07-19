import { IRoundDetail } from "../interfaces/dbTypes";

export class CreateRoundsDto {
  readonly round: number;
  readonly isHasData: boolean;
  readonly dateTime: string;
  readonly details: IRoundDetail[]
}