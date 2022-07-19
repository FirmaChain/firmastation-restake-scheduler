import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Rounds, RoundsSchema } from '../schemas/rounds.schema';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';

@Module({
  imports: [MongooseModule.forFeatureAsync([
    {
      name: Rounds.name,
      useFactory: () => {
        const schema = RoundsSchema;
        schema.plugin(require('mongoose-autopopulate'));
        schema.pre('save', () => {
          console.log('Round pre save');
        });
        return schema;
      }
    }
  ])],
  controllers: [RoundsController],
  providers: [RoundsService],
  exports: [RoundsService]
})
export class RoundsModule {}
