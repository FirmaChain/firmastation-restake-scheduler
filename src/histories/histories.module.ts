import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { HistoriesService } from './histories.service';
import { Histories, HistoriesSchema } from './histories.schema';

@Module({
  imports: [MongooseModule.forFeatureAsync([{
    name: Histories.name,
    useFactory: async () => {
      const schema = HistoriesSchema;
      schema.pre('save', () => {
        console.log('History pre save');
      });
      return schema;
    }
  }])],
  providers: [HistoriesService],
  exports: [HistoriesService]
})
export class HistoriesModule {}
