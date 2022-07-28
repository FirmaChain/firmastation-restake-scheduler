import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type StatusesDocument = Statuses & Document;

@Schema()
export class Statuses {
  @Prop({ required: true })
  nowRound: number;

  @Prop({ required: true })
  feesAmount: number;

  @Prop({ required: true })
  restakeAmount: number;

  @Prop({ required: true })
  restakeCount: number;

  @Prop({ required: true })
  nextRoundDateTime: string;
}

export const StatusesSchema = SchemaFactory.createForClass(Statuses);