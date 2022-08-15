import { IRestakeTarget } from "src/interfaces/types";

export class CreateRoundsDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly roundDetails: RoundDetail[]
}

export class RoundDetail {
  txHash: string;
  dateTime: string;
  restakeAmount: number;
  feesAmount: number;
  restakeCount: number;
  retryCount: number;
  reason: number;
  originRestakeTargets: IRestakeTarget[];
  finalRestakeTargets: IRestakeTarget[];
}