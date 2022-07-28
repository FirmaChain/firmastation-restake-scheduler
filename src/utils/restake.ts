import { AuthorizationType, DelegationInfo, FirmaSDK, FirmaUtil, StakingTxClient, ValidatorDataType } from "@firmachain/firma-js";
import { BroadcastTxFailure, BroadcastTxSuccess } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";
import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";

import { BATCH_TX_COUNT, FIRMACHAIN_CONFIG, MINIMUM_UFCT_REWARD_AMOUNT, RESTAKE_MNEMONIC } from "../config";
import { FirmaSDKHelper } from "./firmaSDKHelper";
import { spliceAsBatchTxsCount } from "./utils";

const RestakeSDK = async (isShowLog: boolean = false) => {
  const firmaSDK = new FirmaSDK(FIRMACHAIN_CONFIG());
  const restakeWallet = await firmaSDK.Wallet.fromMnemonic(RESTAKE_MNEMONIC);
  const restakeAddress = await restakeWallet.getAddress();

  // public (Use only this function externally)
  const restakeProcess = async (): Promise<BroadcastTxSuccess[]> => {
    let executeMsgs = [];
    let valoperAddresses = await getValoperAddresses();

    for (let i = 0; i < valoperAddresses.length; i++) {
      const valoperAddress = valoperAddresses[i];
      const delegators = await getDelegatorsOfValidator(valoperAddress);

      for (let j = 0; j < delegators.length; j++) {
        const delegatorAddress = delegators[j];

        const delegatorRewards = await getRewardsFromDelegator(delegatorAddress, valoperAddress);
        if (delegatorRewards === 0) {
          continue;
        }

        const executeMsg = await makeExecuteMessage(delegatorAddress, restakeAddress, valoperAddress, delegatorRewards);
        if (executeMsg === null) {
          continue;
        }

        executeMsgs.push(executeMsg);
      }
    }

    if (executeMsgs.length === 0) {
      return null;
    }

    const spliceBatchCountData = spliceAsBatchTxsCount(executeMsgs, BATCH_TX_COUNT);
    let restakeTxs = [];

    for (let k = 0; k < spliceBatchCountData.length; k++) {
      const batchTxMessages = spliceBatchCountData[k];
      const gasEstimation = await calcGasEstimation(batchTxMessages);
      const restakeTxResult = await executeAllowanceMessage(batchTxMessages, gasEstimation);

      restakeTxs.push(restakeTxResult);
    }

    return restakeTxs;
  }

  // private (Only used in this script)
  const getValoperAddresses = async () => {
    try {
      let validatorInfo = await firmaSDK.Staking.getValidatorList();
      let validatorList = validatorInfo.dataList;
      let paginationKey = validatorInfo.pagination.next_key;
  
      while (paginationKey !== null) {
        const nextValidatorInfo = await firmaSDK.Staking.getValidatorList(paginationKey);
  
        validatorList.push(...nextValidatorInfo.dataList);
        paginationKey = nextValidatorInfo.pagination.next_key;
      }
  
      return filterJailedValidator(validatorList);
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get valoperAddresses`);
      return [];
    }
  }

  const filterJailedValidator = (validators: ValidatorDataType[]): string[] => {
    let valoperAddresses = [];
    
    validators.map(validator => {
      if (!validator.jailed) {
        valoperAddresses.push(validator.operator_address);
      }
    });

    return valoperAddresses;
  };

  // private (Only used in this script)
  const getDelegatorsOfValidator = async (valoperAddress: string): Promise<string[]> => {
    try {
      let delegationInfo = await firmaSDK.Staking.getDelegationListFromValidator(valoperAddress);
      let delegationList = delegationInfo.dataList;
      let paginationKey = delegationInfo.pagination.next_key;
  
      while (paginationKey !== null) {
        const nextDelegationInfo = await firmaSDK.Staking.getDelegationListFromValidator(valoperAddress);
  
        delegationList.push(...nextDelegationInfo.dataList);
        paginationKey = nextDelegationInfo.pagination.next_key;
      }
  
      return filterDelegatorZeroAmount(delegationList);
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get delegation list from validator`);
      return [];
    }
  }

  // private (Only used in this script)
  const filterDelegatorZeroAmount = (delegationList: DelegationInfo[]): string[] => {
    let addresses = [];

    delegationList.map(delegator => {
      if (Number(delegator.balance.amount) !== 0) {
        addresses.push(delegator.delegation.delegator_address);
      }
    });

    return addresses;
  }

  // private (Only used in this script)
  const getRewardsFromDelegator = async (delegatorAddress: string, valoperAddress: string): Promise<number> => {
    try {
      const withdrawAddress = await firmaSDK.Distribution.getWithdrawAddress(delegatorAddress);

      if (withdrawAddress !== delegatorAddress) {
        return 0;
      }

      const rewardsOrigin = await firmaSDK.Distribution.getRewardInfo(delegatorAddress, valoperAddress);
      const rewardsFCT = FirmaUtil.getFCTStringFromUFCT(Number(rewardsOrigin));
      const rewardsUFCT = FirmaUtil.getUFCTStringFromFCT(Number(rewardsFCT));
      const rewards = Number(rewardsUFCT);

      if (rewards > MINIMUM_UFCT_REWARD_AMOUNT) {
        return rewards;
      }

      return 0;
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get reward info`);
      return 0;
    }
  }

  // private (Only used in this script)
  const makeExecuteMessage = async (delegatorAddress: string, restakeAddress: string, valoperAddress: string, rewards: number): Promise<Any> => {
    try {
      let grantDataList = (await firmaSDK.Authz.getStakingGrantData(delegatorAddress, restakeAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE)).dataList;
      if (grantDataList === null || grantDataList === undefined || grantDataList.length === 0) {
        return null;
      }

      const authIdx = FirmaSDKHelper().getStakeAuthzIdx(grantDataList);
      const allowList = grantDataList[authIdx].authorization.allow_list.address;
      if (!allowList.includes(valoperAddress)) {
        return null;
      }

      let maxToken = grantDataList[authIdx].authorization.max_tokens;
      let receiveRewards: number = rewards;
      let maxTokenAmount: number = 0;

      if (maxToken) {
        maxTokenAmount = Number(maxToken.amount);
  
        if (maxTokenAmount <= 0) {
          return null;
        }
  
        if (maxTokenAmount < rewards) {
          receiveRewards = maxTokenAmount;
        }
      }

      let msgDelegate = StakingTxClient.msgDelegate({
        delegatorAddress: delegatorAddress,
        validatorAddress: valoperAddress,
        amount: { denom: FIRMACHAIN_CONFIG().denom, amount: receiveRewards.toString() }
      });
  
      return FirmaUtil.getAnyData(StakingTxClient.getRegistry(), msgDelegate);
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get staking grant data - ${delegatorAddress}`);
      return null;
    }
  }

  // private (Only used in this script)
  const calcGasEstimation = async (anyData: Any[]): Promise<number> => {
    try {
      return await firmaSDK.Authz.getGasEstimationExecuteAllowance(restakeWallet, anyData);
    } catch (e) {
      return 0;
    }
  }

  // private (Only used in this script)
  const executeAllowanceMessage = async (messages: any[], gasEsitmation: number): Promise<BroadcastTxSuccess | BroadcastTxFailure> => {
    const fee = Math.ceil(gasEsitmation * 0.1);
    
    try {
      return await firmaSDK.Authz.executeAllowance(restakeWallet, messages, { fee: fee, gas: gasEsitmation });
    } catch (e) {
      return null;
    }
  }

  return {
    restakeProcess,
  }
}

export { RestakeSDK };