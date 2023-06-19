import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RoundsService } from './rounds.service';
import { Rounds, RoundsSchema } from './rounds.schema';

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
