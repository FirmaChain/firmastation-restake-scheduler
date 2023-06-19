import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { StatusesService } from './statuses.service';
import { Statuses, StatusesSchema } from './statuses.schema';

@Module({
  imports: [MongooseModule.forFeatureAsync([
    {
      name: Statuses.name,
      useFactory: () => {
        const schema = StatusesSchema;
        schema.pre('save', () => {
          console.log('Status pre save');
        });
        return schema;
      }
    }
  ])],
  providers: [StatusesService],
  exports: [StatusesService]
})
export class StatusesModule {}
