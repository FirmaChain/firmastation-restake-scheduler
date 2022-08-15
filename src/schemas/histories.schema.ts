import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HistoryDetail } from "../dtos/histories.dto";

export type HistoriesDocument = Histories & Document;

@Schema()
export class Histories {
  @Prop()
  round: number;
  
  @Prop()
  dateTime: string;

  @Prop()
  historyDetails: HistoryDetail[];
}

export const HistoriesSchema = SchemaFactory.createForClass(Histories);