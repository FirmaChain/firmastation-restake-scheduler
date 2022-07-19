import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IRoundDetail } from "../interfaces/dbTypes";

export type RoundsDocument = Rounds & Document;

@Schema()
export class Rounds {
  @Prop({ required: true })
  round: number;
  
  @Prop()
  isHasData: boolean;

  @Prop({ required: true })
  dateTime: string;

  @Prop({ required: true })
  details: IRoundDetail[]
}

export const RoundsSchema = SchemaFactory.createForClass(Rounds);