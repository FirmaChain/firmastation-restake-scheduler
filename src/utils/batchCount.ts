import { IExecuteMsg } from "../interfaces/types";

export function spliceAsBatchTxsCount(msgs: IExecuteMsg[], sliceCount: number): IExecuteMsg[][] {
  const totalMsgCount = msgs.length;
  const totalTxCount = totalMsgCount / sliceCount;
  const theRestCount = totalMsgCount % sliceCount ? 0 : totalMsgCount;

  let messages: IExecuteMsg[][] = [];

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