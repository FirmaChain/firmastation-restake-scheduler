import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RestakeService } from './restake.service';

@Module({
  providers: [RestakeService, ConfigService],
  exports: [RestakeService]
})
export class RestakeModule {}
