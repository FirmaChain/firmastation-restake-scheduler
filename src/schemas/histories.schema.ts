import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IAuthTxData } from "../interfaces/types";

export type HistoriesDocument = Histories & Document;

@Schema()
export class Histories {
  @Prop()
  round: number;
  
  @Prop()
  isHasData: boolean;

  @Prop()
  txInfos: IAuthTxData[];
}

export const HistoriesSchema = SchemaFactory.createForClass(Histories);