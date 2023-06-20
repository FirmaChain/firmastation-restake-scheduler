import { Inject, Injectable } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { RestakeService } from 'src/restake/restake.service';
import { MongoDbService } from 'src/mongo-db/mongo-db.service';
import { RoundDetail } from 'src/rounds/rounds.interface';
import { RESTAKE_FAILED_CALC_GAS, RESTAKE_FAILED_EXECUTE, RESTAKE_FAILED_INSUFFICIENT, RESTAKE_SUCCESS } from 'src/constants/restake.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RestakeTaskService {
  private jobName: string = "RESTAKE_JOB";

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly restakeService: RestakeService,
    private readonly mongoDbService: MongoDbService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
  }

  async startScheduler(callback: (message: string, notiMessage?: string) => void) {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      if (cronJobs.has(this.jobName)) {
        callback(`❎ Crontab is already registry(start) : ${this.jobName}`);
        return ;
      } else {
        const cronJob = new CronJob(CronExpression.EVERY_4_HOURS, async () => {
          // TODO
          const restakeResult = await this.restakeSchedulerTask();
          const { resultMsg, failedMsg } = this.makeMessageByRestakeResult(restakeResult.data, restakeResult.round);
          
          callback(resultMsg, failedMsg);
          return ;
        });
        this.schedulerRegistry.addCronJob(this.jobName, cronJob);
      }

      const cronJob = this.schedulerRegistry.getCronJob(this.jobName);
      if (cronJob.running) {
        callback(`❎ Crontab is already running : ${this.jobName}`);
        return;
      }

      cronJob.start();

      callback(`✅ Start restake scheduler : ${this.jobName}`);
      return ;
    } catch (e) {
      const message = `❌ Failed start cron job`;
      this.logger.error(`${message} : ${e}`);
      callback(message);
      return ;
    }
  }

  async stopScheduler(callback: (message: string) => void) {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      if (cronJobs.has(this.jobName)) {
        const cronJob = this.schedulerRegistry.getCronJob(this.jobName);
        if (!cronJob.running) {
          callback(`❎ Crontab is not running : ${this.jobName}`);
          return;
        } else {
          cronJob.stop();
          callback(`❎ Stop restake scheduler : ${this.jobName}`);
          return ;
        }
      } else {
        callback(`❎ Crontab is not registry(stop) : ${this.jobName}`);
        return ;
      }
    } catch (e) {
      const message = `❌ Failed stop cron job`;
      this.logger.error(`${message} : ${e}`);
      callback(message);
      return ;
    }
  }

  getSchedulerJobName(callback: (message: string) => void) {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      if (cronJobs.has(this.jobName)) {
        const isRunCron = this.schedulerRegistry.getCronJob(this.jobName);
        if (isRunCron.running) {
          callback(`❎ Cron is running : ${this.jobName}`);
          return ;
        } else {
          callback(`❎ Cron is not running : ${this.jobName}`);
          return ;
        }
      } else {
        callback(`❎ Crontab is not registry(jobName) : ${this.jobName}`);
        return ;
      }
    } catch(e) {
      const message = `❌ Failed get cron job name`;
      this.logger.error(`${message} : ${e}`);
      callback(message);
      return ;
    }
  }

  getChainId(callback: (message: string) => void) {
    callback(`Chain Network is "${this.restakeService.getChainId()}"`);
    return ;
  }

  getRestakeInfo(callback: (message: string) => void) {
    const minimumRewards = this.configService.get<number>('RESTAKE_MINIMUM_REWARD');
    const batchCount = this.configService.get<number>('RESTAKE_BATCH_COUNT');
    const retryCount = this.configService.get<number>('RESTAKE_RETRY_COUNT');

    const message = `Minimum Rewards : ${minimumRewards}
Batch Count : ${batchCount}
Retry Count : ${retryCount}`

    callback(message);
    return ;
  };

  private async restakeSchedulerTask() {
    try {
      const scheduleDate = new Date().toISOString();
      const restakeResult = await this.restakeService.startRestake();
      const dbWriteResult = await this.mongoDbService.saveDB(restakeResult, scheduleDate);

      return dbWriteResult;
    } catch (e) {
      this.logger.error(`❌ Failed restake scheduler task : ${e}`);
      return null;
    }
  }

  private makeMessageByRestakeResult(roundDetails: RoundDetail[], round: number) {
    let successCount = 0;
    let failedCount = 0;
    let restakeCount = 0;
    let resultMsg = `[ ● RESTAKE ● ]\nROUND: ${round}\n`;
    let failedMsg = '[ ● ERRORS ● ]\n';

    if (roundDetails.length > 0) {
      for (let i = 0; i < roundDetails.length; i++) {
        const roundDetail = roundDetails[i];

        if (roundDetail.reason === RESTAKE_SUCCESS) {
          successCount++;
          restakeCount += roundDetail.restakeCount;
        } else {
          failedCount++;

          failedMsg += `[ ■ STEP ${i + 1} ■ ]\n`;

          switch (roundDetail.reason) {
            case RESTAKE_FAILED_CALC_GAS:
              failedMsg += 'SUCCESS: calc gas\n';
              break;
            case RESTAKE_FAILED_INSUFFICIENT:
              failedMsg += 'SUCCESS: insufficient\n';
              break;
            case RESTAKE_FAILED_EXECUTE:
              failedMsg += 'SUCCESS: execute\n';
              break;
          }

          failedMsg += `RETRY: ${roundDetail.retryCount}\n`;
        }
      }
      failedMsg += '\n'
      resultMsg += `SUCCESS: ${successCount}\n`;
      resultMsg += `FAILED: ${failedCount}\n`;
      resultMsg += `COUNT: ${restakeCount}`;
    } else {
      resultMsg += 'not found targets';
    }

    if (failedCount === 0) {
      failedMsg = "";
    } else if (failedCount === 0 && successCount === 0) {
      failedMsg += "Not process restake(Time out lcd)";
    }

    return {
      resultMsg,
      failedMsg
    }
  }
}
