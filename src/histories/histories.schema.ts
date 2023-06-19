import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HistoryDetail } from "./histories.interface";

@Schema()
export class Histories {
  @Prop()
  round: number;
  
  @Prop()
  dateTime: string;
  
  @Prop()
  historyDetails: HistoryDetail[];
}

export type HistoriesDocument = Histories & Document;

export const HistoriesSchema = SchemaFactory.createForClass(Histories);