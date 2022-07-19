import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Histories, HistoriesSchema } from '../schemas/histories.schema';
import { HistoriesController } from './histories.controller';
import { HistoriesService } from './histories.service';

@Module({
  imports: [MongooseModule.forFeatureAsync([
    {
      name: Histories.name,
      useFactory: () => {
        const schema = HistoriesSchema;
        schema.pre('save', () => {
          console.log('History pre save');
        });
        return schema;
      }
    }
  ])],
  controllers: [HistoriesController],
  providers: [HistoriesService],
  exports: [HistoriesService]
})
export class HistoriesModule {}
