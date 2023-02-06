import { AuthorizationType, FirmaSDK, FirmaUtil, StakingTxClient } from "@firmachain/firma-js";
import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";
import { StakingValidatorStatus } from "@firmachain/firma-js/dist/sdk/FirmaStakingService";

import { BATCH_TX_COUNT, FIRMACHAIN_CONFIG, MINIMUM_UFCT_REWARD_AMOUNT, RESTAKE_MNEMONIC, RETRY_COUNT } from "src/config";
import { ERROR_CALC_GAS, ERROR_EXECUTE_MESSAGE, ERROR_INSUFFICIENT, ERROR_NONE } from "src/constants/errorType";
import { ITransactionState, IExecuteMessage, IRestakeTarget } from "src/interfaces/types";
import { spliceAsBatchTxsCount } from "./batchCount";
import { RestakeSDKHelper } from "./restakeSDKHelper";

const RestakeSDK = async () => {
  const firmaSDK = new FirmaSDK(FIRMACHAIN_CONFIG);
  const restakeWallet = await firmaSDK.Wallet.fromMnemonic(RESTAKE_MNEMONIC);
  const restakeAddress = await restakeWallet.getAddress();

  const getRestakeTargets = async () => {
    const validatorAddressList = await _getValidatorAddressList();
    const restakeTargets: IRestakeTarget[] = [];

    for (let i = 0; i < validatorAddressList.length; i++) {
      const validatorAddress = validatorAddressList[i];
      const delegatorAddressList = await _getDelegatorAddressList(validatorAddress);

      for (let j = 0; j < delegatorAddressList.length; j++) {
        const delegatorAddress = delegatorAddressList[j];

        restakeTargets.push({
          validatorAddr: validatorAddress,
          delegatorAddr: delegatorAddress,
          rewards: 0
        });
      }
    }

    return restakeTargets;
  }

  const getRestakeMessages = async (restakeTargets: IRestakeTarget[]) => {
    let executeMessages: IExecuteMessage[] = [];
    for (let i = 0; i < restakeTargets.length; i++) {
      const restakeTarget = restakeTargets[i];
      const validatorAddress = restakeTarget.validatorAddr;
      const delegatorAddress = restakeTarget.delegatorAddr;

      const maxTokenInfo = await _getAuthzGrantMaxToken(validatorAddress, delegatorAddress);
      if (maxTokenInfo.isValid === false) continue;

      const rewardsInfo = await _getDelegatorRewards(validatorAddress, delegatorAddress);
      if (rewardsInfo.isValid === false) continue;

      const checkWithdrawAddr = await _checkWithdrawAddress(delegatorAddress);
      if (checkWithdrawAddr === false) continue;

      const executeMessage = await _makeExecuteMessage(validatorAddress, delegatorAddress, rewardsInfo.rewards);

      executeMessages.push({
        message: executeMessage,
        restakeTarget: {
          validatorAddr: validatorAddress,
          delegatorAddr: delegatorAddress,
          rewards: rewardsInfo.rewards
        }
      });
    }

    return executeMessages;
  }

  const executeAllowanceMessages = async (originRestakeMessages: IExecuteMessage[]) => {
    let successTransactionStates: ITransactionState[] = [];
    let retryRestakeTargets: IRestakeTarget[][] = [];

    let spliceRestakeMessages = spliceAsBatchTxsCount(originRestakeMessages, BATCH_TX_COUNT);
    for (let i = 0; i < spliceRestakeMessages.length; i++) {
      const spliceRestakeMessage = spliceRestakeMessages[i];
      if (spliceRestakeMessage.length === 0) {
        continue;
      }

      const separateRestakeData = RestakeSDKHelper().separateRestakeMessageAndTargets(spliceRestakeMessage);
      const restakeExecuteMessages = separateRestakeData.restakeExecuteMessages;
      const restakeExecuteTargets = separateRestakeData.restakeExecuteTargets;

      const executeTxResult = await _executeTransaction(restakeExecuteMessages);
      executeTxResult.originRestakeTargets = restakeExecuteTargets;
      executeTxResult.retryCount = 0;
      executeTxResult.finalRestakeTargets = [];
      
      if (executeTxResult.errorType === ERROR_NONE || executeTxResult.errorType === ERROR_INSUFFICIENT) {
        successTransactionStates.push(executeTxResult);
      } else {
        console.log(`<EXECUTE> restake failed reason: ${executeTxResult.errorType}`);
        retryRestakeTargets.push(restakeExecuteTargets);
      }
    }

    return {
      successTransactionStates,
      retryRestakeTargets
    }
  }

  const retryExecuteAllowanceMessages = async (retryRestakeTargets: IRestakeTarget[][]) => {
    let endTransactionStates: ITransactionState[] = [];

    for (let i = 0; i < retryRestakeTargets.length; i++) {
      let retryRestakeTarget = retryRestakeTargets[i];

      // retry restake
      let retryCount = 1;
      let originRestakeTargets = retryRestakeTarget;
      
      while (retryRestakeTarget.length !== 0) {
        const retryRestakeMessages = await getRestakeMessages(retryRestakeTarget);
        const separateRestakeData = RestakeSDKHelper().separateRestakeMessageAndTargets(retryRestakeMessages);
        const restakeExecuteMessages = separateRestakeData.restakeExecuteMessages;
        retryRestakeTarget = separateRestakeData.restakeExecuteTargets;
        
        const executeTxResult = await _executeTransaction(restakeExecuteMessages);
        
        retryCount++;
        if (retryCount > RETRY_COUNT || executeTxResult.errorType === ERROR_NONE || executeTxResult.errorType === ERROR_INSUFFICIENT) {
          executeTxResult.originRestakeTargets = originRestakeTargets;
          executeTxResult.finalRestakeTargets = retryRestakeTarget;
          executeTxResult.retryCount = retryCount >= RETRY_COUNT ? RETRY_COUNT : retryCount;
          executeTxResult.transactionResult = executeTxResult.transactionResult;
          endTransactionStates.push(executeTxResult);

          break;
        } else {
          console.log(`<RETRY> restake failed reason: ${executeTxResult.errorType}`);
        }
      }
    }
    return endTransactionStates;
  }

  const _getRestakeWalletBalance = async () => {
    const balance = await firmaSDK.Bank.getBalance(restakeAddress);

    return Number(balance);
  }

  const _getValidatorAddressList = async () => {
    let validatorInfo = await firmaSDK.Staking.getValidatorList();
    let validatorList = validatorInfo.dataList;
    let paginationKey = validatorInfo.pagination.next_key;

    let valoperAddrs: string[] = [];

    while (paginationKey !== null) {
      const nextValidatorInfo = await firmaSDK.Staking.getValidatorList(StakingValidatorStatus.BONDED, paginationKey);
      const nextValidatorList = nextValidatorInfo.dataList;

      validatorList.push(...nextValidatorList);
      paginationKey = nextValidatorInfo.pagination.next_key;
    }

    for (let i = 0; i < validatorList.length; i++) {
      const validator = validatorList[i];

      if (validator.jailed) {
        continue ;
      }

      valoperAddrs.push(validator.operator_address);
    }

    return valoperAddrs;
  }

  const _getDelegatorAddressList = async (validatorAddr: string) => {
    let delegatorAddresses: string[] = [];

    let delegatorInfo = await firmaSDK.Staking.getDelegationListFromValidator(validatorAddr);
    let delegationList = delegatorInfo.dataList;
    let paginationKey = delegatorInfo.pagination.next_key;

    while (paginationKey !== null) {
      const nextDelegationInfo = await firmaSDK.Staking.getDelegationListFromValidator(validatorAddr, paginationKey);
      delegationList.push(...nextDelegationInfo.dataList);

      paginationKey = nextDelegationInfo.pagination.next_key;
    }

    for (let i = 0; i < delegationList.length; i++) {
      const delegation = delegationList[i];

      delegatorAddresses.push(delegation.delegation.delegator_address);
    }

    return delegatorAddresses;
  }

  const _getAuthzGrantMaxToken = async (validatorAddr: string, delegatorAddr: string) => {
    try {
      let grantInfo = await firmaSDK.Authz.getStakingGrantData(delegatorAddr, restakeAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE);
      let grantList = grantInfo.dataList;
      let paginationKey = grantInfo.pagination.next_key;
      
      while (paginationKey !== '') {
        const nextGrantInfo = await firmaSDK.Authz.getStakingGrantData(delegatorAddr, restakeAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE);
        const nextGrantList = nextGrantInfo.dataList;

        grantList.push(...nextGrantList);
        paginationKey = nextGrantInfo.pagination.next_key;
      }

      const authIdx = RestakeSDKHelper().getStakeAuthzIdx(grantList);
      const allowList = grantList[authIdx].authorization.allow_list.address;

      if (!allowList.includes(validatorAddr)) {
        return {
          isValid: false,
          maxToken: undefined
        }
      }

      let maxToken = grantList[authIdx].authorization.max_tokens;
      if (maxToken !== null) {
        return {
          isValid: false,
          maxToken: undefined
        }
      }
      
      return {
        isValid: true,
        maxToken: maxToken
      }
    } catch (e) {
      return {
        isValid: false,
        maxToken: undefined
      }
    }
  }

  const _getDelegatorRewards = async (validatorAddr: string, delegatorAddr: string) => {
    try {
      const rewardsOrigin = await firmaSDK.Distribution.getRewardInfo(delegatorAddr, validatorAddr);
      const rewardsFCT = FirmaUtil.getFCTStringFromUFCT(Number(rewardsOrigin));
      const rewardsUFCT = FirmaUtil.getUFCTStringFromFCT(Number(rewardsFCT));
      const rewards = Number(rewardsUFCT);

      if (rewards >= MINIMUM_UFCT_REWARD_AMOUNT) {
        return {
          isValid: true,
          rewards: rewards
        }
      }

      return {
        isValid: false,
        rewards: -2
      }
    } catch (e) {
      return {
        rewards: -1,
        isValid: false
      }
    }
  }

  const _checkWithdrawAddress = async (delegatorAddr: string) => {
    const withdrawAddr = await firmaSDK.Distribution.getWithdrawAddress(delegatorAddr);
    
    if (delegatorAddr !== withdrawAddr)
      return false;

    return true;
  }

  const _makeExecuteMessage = async (validatorAddr: string, delegatorAddr: string, rewards: number) => {
    let msgDelegate = StakingTxClient.msgDelegate({
      delegatorAddress: delegatorAddr,
      validatorAddress: validatorAddr,
      amount: { denom: FIRMACHAIN_CONFIG.denom, amount: rewards.toString() }
    });
    
    const executeMsg = FirmaUtil.getAnyData(StakingTxClient.getRegistry(), msgDelegate);

    return executeMsg;
  }

  const _calcGasEstimation = async (anyData: Any[]) => {
    try {
      let gasEstimation = await firmaSDK.Authz.getGasEstimationExecuteAllowance(restakeWallet, anyData)
    
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

  const _executeAllowanceMessage = async (messages: Any[], gasEstimation: number) => {
    const fees = Math.ceil(gasEstimation * .1);
    
    try {
      const executeResult = await firmaSDK.Authz.executeAllowance(restakeWallet, messages, { fee: fees, gas: gasEstimation });
      return {
        isValid: true,
        executeResult
      }
    } catch (e) {
      return {
        isValid: false,
        executeResult: null
      }
    }
  }

  const _executeTransaction = async (messages: Any[]): Promise<ITransactionState> => {
    const nowDate = new Date();
    const gasEstimationInfo = await _calcGasEstimation(messages);
    if (gasEstimationInfo.isValid === false) {
      return {
        errorType: ERROR_CALC_GAS,
        dateTime: nowDate.toISOString(),
        transactionResult: null
      };
    }
    
    const restakeWalletAmount = await _getRestakeWalletBalance();
    if (restakeWalletAmount < (gasEstimationInfo.gasEstimation * 0.1)) {
      return {
        errorType: ERROR_INSUFFICIENT,
        dateTime: nowDate.toISOString(),
        transactionResult: null
      }
    }

    const executeAllowanceResult = await _executeAllowanceMessage(messages, gasEstimationInfo.gasEstimation);
    if (executeAllowanceResult.isValid === false) {
      return {
        errorType: ERROR_EXECUTE_MESSAGE,
        dateTime: nowDate.toISOString(),
        transactionResult: null
      }
    }

    return {
      errorType: ERROR_NONE,
      dateTime: nowDate.toISOString(),
      transactionResult: executeAllowanceResult.executeResult
    }
  }

  return {
    getRestakeTargets,
    getRestakeMessages,
    executeAllowanceMessages,
    retryExecuteAllowanceMessages
  }
};

export { RestakeSDK };