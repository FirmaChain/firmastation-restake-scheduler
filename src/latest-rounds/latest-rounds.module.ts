import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LatestRoundsService } from './latest-rounds.service';
import { LatestRounds, LatestRoundsSchema } from './latest-rounds.schema';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: LatestRounds.name,
        useFactory: () => {
          const schema = LatestRoundsSchema;
          schema.pre('save', () => {
            console.log('Round pre save');
          });
          return schema;
        },
      },
    ]),
  ],
  providers: [LatestRoundsService],
  exports: [LatestRoundsService],
})
export class LatestRoundsModule {}
