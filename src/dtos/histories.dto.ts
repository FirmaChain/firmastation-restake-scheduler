export class CreateHistoriesDto {
  readonly round: number;
  readonly isHasData: boolean;
  readonly txInfos: TxInfoDto[];
}

export class TxInfoDto {
  gasUsed: number;
  gasWanted: number;
  height: number;
  txHash: string;
  rawlog: string;
  dateTime: string;
}