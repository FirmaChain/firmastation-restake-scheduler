import { GrantStakingData } from "@firmachain/firma-js/dist/sdk/firmachain/authz";
import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";

import { IExecuteMessage, IRestakeTarget } from "src/interfaces/types";

const RestakeSDKHelper = () => {
  function getStakeAuthzIdx(_grantStakingData: GrantStakingData[]) {
    let isCheck: number = -1;

    for (let i = 0; i < _grantStakingData.length; i++) {
      if (_grantStakingData[i].authorization["@type"] === "/cosmos.staking.v1beta1.StakeAuthorization") {
        isCheck = i;
      }
    }

    return isCheck;
  }

  function separateRestakeMessageAndTargets(executeMessages: IExecuteMessage[]) {
    let restakeExecuteMessages: Any[] = [];
    let restakeExecuteTargets: IRestakeTarget[] = [];

    for (let i = 0; i < executeMessages.length; i++) {
      restakeExecuteMessages.push(executeMessages[i].message);
      restakeExecuteTargets.push(executeMessages[i].restakeTarget);
    }

    return {
      restakeExecuteMessages: restakeExecuteMessages,
      restakeExecuteTargets: restakeExecuteTargets
    }
  }

  function parseRawLog(rawLog: string) {
    let restakeAmount = 0;
    let restakeCount = 0;

    try {
      const events = JSON.parse(rawLog)[0]['events'];
      for (let j = 0; j < events.length; j++) {
        const event = events[j];
        const attributes = event['attributes'];
  
        if (event['type'] !== 'delegate') continue;
  
        for (let k = 0; k < attributes.length; k++) {
          const attribute = attributes[k];
  
          if (attribute['key'] !== 'amount') continue;
  
          const amount = Number(attribute['value'].replace('ufct', ''));
  
          restakeAmount += amount;
          restakeCount++;
        }

        return {
          restakeAmount,
          restakeCount
        }
      }
    } catch (e) {
      console.log(`Data does not exist.`);

      return {
        restakeAmount,
        restakeCount
      }
    }
  }

  return {
    getStakeAuthzIdx,
    separateRestakeMessageAndTargets,
    parseRawLog,
  }
}


export { RestakeSDKHelper }