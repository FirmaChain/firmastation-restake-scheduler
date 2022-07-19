import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Statuses, StatusesSchema } from '../schemas/statuses.schema';
import { StatusesController } from './statuses.controller';
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
  controllers: [StatusesController],
  providers: [StatusesService],
  exports: [StatusesService]
})
export class StatusesModule {}
