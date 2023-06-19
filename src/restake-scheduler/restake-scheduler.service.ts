import { Injectable } from '@nestjs/common';

import {
  COMMAND_LIST,
  COMMAND_RESTAKE_DENOM,
  COMMAND_RESTAKE_INFO,
  COMMAND_RESTAKE_SCHEDULER_START,
  COMMAND_RESTAKE_SCHEDULER_STOP,
  COMMAND_RESTAKE_STATUS,
  GUIDE_DESC
} from 'src/constants/telegraf.constant';
import { RestakeBotService } from 'src/restake-bot/restake-bot.service';
import { RestakeTaskService } from 'src/restake-task/restake-task.service';

@Injectable()
export class RestakeSchedulerService {
  constructor(
    private readonly restakeBotService: RestakeBotService,
    private readonly restakeTaskService: RestakeTaskService
  ) {
    this.InitializeRestakeBot();
  }
  
  InitializeRestakeBot() {
    this.restakeBotService.addCommandListener(COMMAND_LIST, async () => {
      await this.restakeBotService.sendMessage(GUIDE_DESC);
    });

    this.restakeBotService.addCommandListener(COMMAND_RESTAKE_SCHEDULER_START, async () => {
      await this.restakeTaskService.startScheduler(async (message, notiMessage) => {
        await this.restakeBotService.sendMessage(message);
        if (notiMessage !== undefined && notiMessage !== "") {
          await this.restakeBotService.sendNotiMessage(notiMessage);
        }
      });
    });
    
    this.restakeBotService.addCommandListener(COMMAND_RESTAKE_SCHEDULER_STOP, async () => {
      await this.restakeTaskService.stopScheduler((message) => {
        this.restakeBotService.sendMessage(message);
      });
    });

    this.restakeBotService.addCommandListener(COMMAND_RESTAKE_STATUS, async () => {
      this.restakeTaskService.getSchedulerJobName(async (message) => {
        await this.restakeBotService.sendMessage(message);
      });
    });

    this.restakeBotService.addCommandListener(COMMAND_RESTAKE_DENOM, async () => {
      this.restakeTaskService.getChainId(async (message) => {
        await this.restakeBotService.sendMessage(message);
      });
    });

    this.restakeBotService.addCommandListener(COMMAND_RESTAKE_INFO, async () => {
      this.restakeTaskService.getRestakeInfo(async (message) => {
        await this.restakeBotService.sendMessage(message);
      });
    });
  }
}

