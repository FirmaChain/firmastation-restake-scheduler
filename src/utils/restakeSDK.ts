import { AuthorizationType, DelegationInfo, FirmaSDK, FirmaUtil, StakingTxClient, ValidatorDataType } from "@firmachain/firma-js";
import { BroadcastTxFailure, BroadcastTxSuccess } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";
import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";

import { BATCH_TX_COUNT, FIRMACHAIN_CONFIG, RESTAKE_MNEMONIC } from "../config";
import { RestakeSDKHelper } from "./restakeSDKHelper";
import { spliceAsBatchTxsCount } from "./batchCount";
import { IExecuteMsg, IExecuteTxFailure, IRestakeResult, IRestakeTarget } from "../interfaces/types";

const RestakeSDK = async (isShowLog: boolean = false) => {
  const firmaSDK = new FirmaSDK(FIRMACHAIN_CONFIG);
  const restakeWallet = await firmaSDK.Wallet.fromMnemonic(RESTAKE_MNEMONIC);
  const restakeAddress = await restakeWallet.getAddress();

  // public (Use only this function externally)
  const getRestakeTargets = async (): Promise<IRestakeTarget[]> => {
    let executeTarget: IRestakeTarget[] = [];
    let valoperInfos = await getValoperAddresses();

    if (valoperInfos.isValid === false) {
      return [];
    }

    let valoperAddresses = valoperInfos.addresses;

    for (let i = 0; i < valoperAddresses.length; i++) {
      const valoperAddress = valoperAddresses[i];
      const delegators = await getDelegatorsOfValidator(valoperAddress);

      for (let j = 0; j < delegators.length; j++) {
        const delegatorAddress = delegators[j];

        // Check authz
        const grantsMaxToken = await getAuthzGrantsMaxToken(delegatorAddress, valoperAddress);
        if (grantsMaxToken.isValid === false) {
          continue;
        } else {
          if (grantsMaxToken.maxToken) {
            let maxTokenAmount = Number(grantsMaxToken.maxToken.amount);

            if (maxTokenAmount <= 0) {
              continue ;
            }
          }
        }

        // Check rewards
        const rewardInfo = await getRewardsFromDelegator(delegatorAddress, valoperAddress);
        if (rewardInfo.isValid === false) {
          continue;
        }

        // Check withdraw address
        const isSameAddress = await checkWidthdrawAddress(delegatorAddress);
        if (isSameAddress === false) {
          continue;
        }

        executeTarget.push({
          delegatorAddress: delegatorAddress,
          valoperAddress: valoperAddress,
          rewards: rewardInfo.rewards
        });
      }
    }

    return executeTarget;
  }

  // public (Use only this function externally)
  const makeExecuteMsgs = async (restakeTargets: IRestakeTarget[]) => {
    let executeMsgs = [];
    for (let i = 0; i < restakeTargets.length; i++) {
      const delegatorAddress = restakeTargets[i].delegatorAddress;
      const valoperAddress = restakeTargets[i].valoperAddress;
      const rewards = restakeTargets[i].rewards;

      let msgDelegate = StakingTxClient.msgDelegate({
        delegatorAddress: delegatorAddress,
        validatorAddress: valoperAddress,
        amount: { denom: FIRMACHAIN_CONFIG.denom, amount: rewards.toString() }
      });

      const executeMsg = FirmaUtil.getAnyData(StakingTxClient.getRegistry(), msgDelegate);

      executeMsgs.push({
        executeMsg: executeMsg,
        executeTarget: {
          delegatorAddress: delegatorAddress,
          valoperAddress: valoperAddress
        }
      });
    }

    return executeMsgs;
  }

  // public (Use only this function externally)
  const executeRestake = async (executeMsgs: IExecuteMsg[]): Promise<IRestakeResult> => {
    let restakeSuccessTxs: (BroadcastTxSuccess | BroadcastTxFailure)[] = [];
    let restakeFailedTxs: IExecuteTxFailure[] = [];

    const spliceBatchCountData = spliceAsBatchTxsCount(executeMsgs, BATCH_TX_COUNT);

    for (let i = 0; i < spliceBatchCountData.length; i++) {
      const batchTxMessages = spliceBatchCountData[i];

      let gasExecuteMsgs: Any[] = [];
      let restakeTarget: IRestakeTarget[] = [];

      for (let j = 0; j < batchTxMessages.length; j++) {
        const batchTxMessage = batchTxMessages[j];

        gasExecuteMsgs.push(batchTxMessage.executeMsg);
        restakeTarget.push(batchTxMessage.executeTarget);
      }

      const gasEstimationInfo = await calcGasEstimation(gasExecuteMsgs);
      if (gasEstimationInfo.isValid === false) {
        continue ;
      }

      // TODO (not enough wallet balance)
      // const restakeWalletAmount = await firmaSDK.Bank.getBalance(restakeAddress);

      // if (restakeWalletAmount < gasEstimationInfo.gasEstimation) {
      //   return {
      //     restakeSuccessTxs: [],

      //   }
      // }
      const restakeTxResult = await executeAllowanceMessage(gasExecuteMsgs, gasEstimationInfo.gasEstimation);

      if (restakeTxResult.code === 0) {
        restakeSuccessTxs.push(restakeTxResult);
      } else {
        restakeFailedTxs.push({
          restakeTxResult,
          restakeTarget
        });
      }
    }

    return {
      restakeSuccessTxs,
      restakeFailedTxs
    }
  }

  // private (Only used in this script)
  const getValoperAddresses = async (): Promise<{isValid: boolean, addresses: string[]}> => {
    try {
      let validatorInfo = await firmaSDK.Staking.getValidatorList();
      let validatorList = validatorInfo.dataList;
      let paginationKey = validatorInfo.pagination.next_key;

      while (paginationKey !== null) {
        const nextValidatorInfo = await firmaSDK.Staking.getValidatorList(paginationKey);

        validatorList.push(...nextValidatorInfo.dataList);
        paginationKey = nextValidatorInfo.pagination.next_key;
      }

      let addresses = filterJailedValidator(validatorList);

      return {
        isValid: true,
        addresses: addresses
      } 
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get valoperAddresses`);
      return {
        isValid: false,
        addresses: []
      };
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
  const getAuthzGrantsMaxToken = async (delegatorAddress: string, valoperAddress: string) => {
    try {
      const stakingGrantData = await firmaSDK.Authz.getStakingGrantData(delegatorAddress, restakeAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE);
      const grantDataList = stakingGrantData.dataList;

      const authIdx = RestakeSDKHelper().getStakeAuthzIdx(grantDataList);
      const allowList = grantDataList[authIdx].authorization.allow_list.address;

      if (!allowList.includes(valoperAddress)) {
        return {
          isValid: false,
          message: 'Not allowed validator',
          maxToken: undefined
        };
      }

      let maxToken = grantDataList[authIdx].authorization.max_tokens;

      return {
        isValid: true,
        message: 'sucess',
        maxToken: maxToken
      };
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get staking grant data - ${delegatorAddress}`);

      return {
        isValid: false,
        message: `Unable to get staking grant data`,
        maxToken: undefined
      };
    }
  }

  // private (Only used in this script)
  const checkWidthdrawAddress = async (delegatorAddress: string): Promise<boolean> => {
    const withdrawAddress = await firmaSDK.Distribution.getWithdrawAddress(delegatorAddress);

    if (delegatorAddress === withdrawAddress) {
      return true;
    }

    return false;
  }
  
  // private (Only used in this script)
  const getRewardsFromDelegator = async (delegatorAddress: string, valoperAddress: string): Promise<{rewards: number, isValid: boolean}> => {
    try {
      const rewardsOrigin = await firmaSDK.Distribution.getRewardInfo(delegatorAddress, valoperAddress);
      const rewardsFCT = FirmaUtil.getFCTStringFromUFCT(Number(rewardsOrigin));
      const rewardsUFCT = FirmaUtil.getUFCTStringFromFCT(Number(rewardsFCT));
      const rewards = Number(rewardsUFCT);

      return {
        rewards: rewards,
        isValid: true
      }
    } catch (e) {
      if (isShowLog) console.log(`[ERROR] Can't get reward info`);
      return {
        rewards: -1,
        isValid: false
      }
    }
  }

  // private (Only used in this script)
  const calcGasEstimation = async (anyData: Any[]): Promise<{isValid: boolean, gasEstimation: number}> => {
    try {
      let gasEstimation = await firmaSDK.Authz.getGasEstimationExecuteAllowance(restakeWallet, anyData);

      return {
        isValid: true,
        gasEstimation: gasEstimation
      }
    } catch (e) {
      return {
        isValid: false,
        gasEstimation: -1
      }
    }
  }

  // private (Only used in this script)
  const executeAllowanceMessage = async (messages: any[], gasEsitmation: number): Promise<BroadcastTxSuccess | BroadcastTxFailure> => {
    const fee = Math.ceil(gasEsitmation * 0.1);

    try {
      return await firmaSDK.Authz.executeAllowance(restakeWallet, messages, { fee: fee, gas: gasEsitmation });
    } catch (e) {
      return e;
    }
  }

  return {
    makeExecuteMsgs,
    getRestakeTargets,
    executeRestake,
  }
}

export { RestakeSDK };