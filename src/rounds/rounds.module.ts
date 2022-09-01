import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Rounds, RoundsSchema } from '../schemas/rounds.schema';
import { RoundsService } from './rounds.service';

@Module({
  imports: [MongooseModule.forFeatureAsync([
    {
      name: Rounds.name,
      useFactory: () => {
        const schema = RoundsSchema;
        schema.pre('save', () => {
          console.log('Round pre save');
        });
        return schema;
      }
    }
  ])],
  providers: [RoundsService],
  exports: [RoundsService]
})
export class RoundsModule {}
