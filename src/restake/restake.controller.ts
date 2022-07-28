import { Controller, Get, Param } from '@nestjs/common';

import { IRestakeInfo } from '../interfaces/types';
import { RestakeService } from './restake.service';;

@Controller('restake')
export class RestakeController {
  constructor(private readonly restakeService: RestakeService) {
  }

  @Get('info')
  async getRestakeInfo(): Promise<IRestakeInfo> {
    return await this.restakeService.getRestakeInfoForStationApp();
  }

  @Get('status/:count')
  async getRestakeWebStatus(@Param('count') count: number) {
    return await this.restakeService.getRestakeInfoForRestakeWeb(count);
  }
}
