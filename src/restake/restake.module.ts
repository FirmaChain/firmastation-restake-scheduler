import { Module } from '@nestjs/common';

import { RestakeController } from './restake.controller';
import { RestakeService } from './restake.service';

@Module({
  controllers: [
    RestakeController
  ],
  providers: [
    RestakeService
  ]
})
export class RestakeModule {}
