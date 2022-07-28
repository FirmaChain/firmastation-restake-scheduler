import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Statuses, StatusesSchema } from '../schemas/statuses.schema';
import { StatusesService } from './statuses.service';

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
