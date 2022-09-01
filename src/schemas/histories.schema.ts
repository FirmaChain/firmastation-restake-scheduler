import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HistoryDetail } from "src/interfaces/types";

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