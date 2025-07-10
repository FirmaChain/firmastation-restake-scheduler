import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RoundDetail } from './rounds.interface';

export type RoundsDocument = Rounds & Document;

@Schema()
export class Rounds {
  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  scheduleDate: string;

  @Prop({ required: true })
  roundDetails: RoundDetail[];
}

export const RoundsSchema = SchemaFactory.createForClass(Rounds);
