import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TxInfoDto } from "../dtos/histories.dto";

export type HistoriesDocument = Histories & Document;

@Schema()
export class Histories {
  @Prop()
  round: number;
  
  @Prop()
  isHasData: boolean;

  @Prop()
  txInfos: TxInfoDto[];
}

export const HistoriesSchema = SchemaFactory.createForClass(Histories);