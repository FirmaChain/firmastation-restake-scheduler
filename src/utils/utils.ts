import { CronExpression } from "@nestjs/schedule";

export function spliceAsBatchTxsCount(msgs: any[], sliceCount: number): any[][] {
  const totalMsgCount = msgs.length;
  const totalTxCount = totalMsgCount / sliceCount;
  const theRestCount = totalMsgCount % sliceCount ? 0 : totalMsgCount;

  let messages: any[][] = [];

  if (totalTxCount === 0) {
    messages[0] = msgs;
  } else {
    for (let i = 0; i < totalTxCount; i++) {
      let startIdx = i * sliceCount;
      let endIdx = i === (totalTxCount - 1) ? theRestCount : ((i + 1) * sliceCount);

      messages[i] = msgs.slice(startIdx, endIdx);
    }
  }

  return messages;
}

export function convertFreequancy(freequancy: string) {
  let text: string;
  let cronExpression: CronExpression;
  let nextTimeValue: number;
  
  switch (freequancy) {
    case '4 Hour':
      cronExpression = CronExpression.EVERY_4_HOURS;
      break;
    case '30 minutes':
      cronExpression = CronExpression.EVERY_30_MINUTES;
      break;
    case '5 Minute':
      cronExpression = CronExpression.EVERY_5_MINUTES;
      break;
    case '30 Seconds':
      cronExpression = CronExpression.EVERY_30_SECONDS;
      break;
  }

  nextTimeValue = Number(freequancy.split(' ')[0]);

  return {
    text,
    cronExpression,
    nextTimeValue
  }
}