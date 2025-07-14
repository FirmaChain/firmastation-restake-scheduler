import { Target } from 'src/restake/restake.interface';

export class RoundDetail {
  txHash: string;
  dateTime: string;
  restakeAmount: number;
  feesAmount: number;
  restakeCount: number;
  retryCount: number;
  reason: number;
  originRestakeTargets: Target[];
  finalRestakeTargets: Target[];
}

export class RoundsDto {
  readonly round: number;
  readonly scheduleDate: string;
  readonly roundDetails: RoundDetail[];
}
