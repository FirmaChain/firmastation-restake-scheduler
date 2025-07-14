import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RoundDetail } from 'src/rounds/rounds.interface';

export type LatestRoundsDocument = LatestRounds & Document;

@Schema()
export class LatestRounds {
  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  scheduleDate: string;

  @Prop({ required: true })
  roundDetails: RoundDetail[];
}

export const LatestRoundsSchema = SchemaFactory.createForClass(LatestRounds);
