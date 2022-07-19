import { FirmaSDK, FirmaUtil } from "@firmachain/firma-js";
import { GrantStakingData } from "@firmachain/firma-js/dist/sdk/firmachain/authz";
import { AuthorizationType } from "@firmachain/firma-js/dist/sdk/firmachain/authz/AuthzTxTypes";
import { BroadcastTxResponse } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";
import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";
import { StakingTxClient, ValidatorDataType } from "@firmachain/firma-js/dist/sdk/firmachain/staking";
import { FirmaWalletService } from "@firmachain/firma-js/dist/sdk/FirmaWalletService";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";

import { IDelegators, IDelegatorsReward, IGrantsDelegator } from "../interfaces/types";
import { FIRMACHAIN_CONFIG, MINIMUM_UFCT_REWARD_AMOUNT, RESTAKE_MNEMONIC } from "../config";
import { FirmaSDKHelper } from "./firmaSDKHelper";

const firmaREStakeInterval = () => {
  const firmaSDK = new FirmaSDK(FIRMACHAIN_CONFIG());

  function getSDK() {
    return firmaSDK;
  }

  async function getREStakeWallet() {
    return await firmaSDK.Wallet.fromMnemonic(RESTAKE_MNEMONIC);
  }

  async function getValidators(): Promise<ValidatorDataType[]> {
    let validatorInfo = await firmaSDK.Staking.getValidatorList();
    let validatorList = validatorInfo.dataList;
    let nextKey = validatorInfo.pagination.next_key;

    while (nextKey !== null) {
      const nextValidatorInfo = await firmaSDK.Staking.getValidatorList(nextKey);

      validatorList.push(...nextValidatorInfo.dataList);
      nextKey = nextValidatorInfo.pagination.next_key;
    }

    return validatorList;
  }

  async function getDelegators(valoperAddress: string): Promise<IDelegators> {
    let retData: IDelegators = {
      valoperAddress: valoperAddress,
      delegators: []
    }
    let delegatorInfo = await firmaSDK.Staking.getDelegationListFromValidator(valoperAddress);
    let delegatorList = delegatorInfo.dataList;
    let nextKey = delegatorInfo.pagination.next_key;
    let addresses: string[] = [];

    while (nextKey !== null) {
      const nextDelegatorInfo = await firmaSDK.Staking.getDelegationListFromValidator(valoperAddress, nextKey);

      delegatorList.push(...nextDelegatorInfo.dataList);
      nextKey = nextDelegatorInfo.pagination.next_key;
    }

    addresses = delegatorList.map((elem) => {
      if (Number(elem.balance.amount) === 0) return '';
      
      return elem.delegation.delegator_address;
    });
    
    addresses = addresses.filter((elem) => {
      return elem != '';
    });

    retData.valoperAddress = valoperAddress
    retData.delegators = addresses;

    return retData;
  }

  async function getPossibleRewardDelegators(delegatorInfos: IDelegators): Promise<IDelegatorsReward[]> {
    let delegatorList: IDelegatorsReward[] = [];
    let valoperAddress = delegatorInfos.valoperAddress;
    let delegatorAddresses = delegatorInfos.delegators;

    for (let i = 0; i < delegatorAddresses.length; i++) {
      const address = delegatorAddresses[i];

      // check withdraw address
      const withdrawAddr = await firmaSDK.Distribution.getWithdrawAddress(address);

      if (address !== withdrawAddr) {
        continue ;
      }
      
      // check reward
      const rewardsOrigin = await firmaSDK.Distribution.getRewardInfo(address, valoperAddress);
      const rewardsFCT = FirmaUtil.getFCTStringFromUFCT(Number(rewardsOrigin));
      const rewardsUFCT = FirmaUtil.getUFCTStringFromFCT(Number(rewardsFCT));
      const rewards = Number(rewardsUFCT);

      if (rewards > MINIMUM_UFCT_REWARD_AMOUNT) {
        const delegatorRewardElem: IDelegatorsReward = { address: address, rewards: rewards };

        delegatorList.push(delegatorRewardElem);
      }
    }

    return delegatorList;
  }

  async function getGrantDelegators(delegatorsReward: IDelegatorsReward[], botAddress: string, valoperAddress: string): Promise<IGrantsDelegator[]> {
    let grantsList: IGrantsDelegator[] = [];

    for (let i = 0; i < delegatorsReward.length; i++) {
      const address = delegatorsReward[i].address;
      const rewards = delegatorsReward[i].rewards;

      const grants = await getGrants(address, botAddress);

      if (grants !== null) {
        const authIdx: number = FirmaSDKHelper().getStakeAuthzIdx(grants);
        const allowAddresses: string[] = grants[authIdx].authorization.allow_list.address;

        if (!allowAddresses.includes(valoperAddress)) continue ;

        const grantsData: IGrantsDelegator = {
          address: address,
          grants: grants,
          rewards: rewards
        }

        grantsList.push(grantsData);
      }
    }
    
    return grantsList;
  }

  async function getGrants(delegateAddress: string, botAddress: string): Promise<GrantStakingData[]>{
    try {
      return (await firmaSDK.Authz.getStakingGrantData(delegateAddress, botAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE)).dataList;
    } catch (e) {
      return null;
    }
  }

  async function getExecuteMsg(grantsDelegators: IGrantsDelegator[], valoperAddress: string) {
    const denom = FIRMACHAIN_CONFIG().denom;

    let executeMsg = [];

    for (let i = 0; i < grantsDelegators.length; i++) {
      const grantsDelegator: IGrantsDelegator = grantsDelegators[i];

      let address: string = grantsDelegator.address;
      let grants: GrantStakingData[] = grantsDelegator.grants;
      let rewards: number = grantsDelegator.rewards;
      let maxTokens: Coin = null;
      let maxTokenAmount: number = maxTokens ? Number(maxTokens.amount) : 0;

      const authzIdx = FirmaSDKHelper().getStakeAuthzIdx(grants);
      if (authzIdx === -1) continue;

      maxTokens = grants[authzIdx].authorization.max_tokens;

      if (maxTokens) {
        // If there is no token, proceed to the next one (continue)
        if (maxTokenAmount <= 0) { 
          continue;
        }

        if (maxTokenAmount < Number(rewards)) {
          rewards = maxTokenAmount;
        }
      }

      const sendAmount: Coin = { denom: denom, amount: rewards.toString() };
      
      let msgDelegate = StakingTxClient.msgDelegate({
        delegatorAddress: address,
        validatorAddress: valoperAddress,
        amount: sendAmount
      });

      const anyData = FirmaUtil.getAnyData(StakingTxClient.getRegistry(), msgDelegate);

      executeMsg.push(anyData);
    }

    return executeMsg;
  }

  async function getGasEstimation(wallet: FirmaWalletService, anyData: Any[]): Promise<number> {
    return await firmaSDK.Authz.getGasEstimationExecuteAllowance(wallet, anyData);
  }

  async function sendAuthzDelegateExecute(wallet: FirmaWalletService, anyData: Any[], gasEsitmation: number): Promise<BroadcastTxResponse> {
    const fee = Math.ceil(gasEsitmation * 0.1);

    try {
      return await firmaSDK.Authz.executeAllowance(wallet, anyData, { fee: fee, gas: gasEsitmation });
    } catch (e) {
      return null;
    }
  }

  return {
    getSDK,
    getREStakeWallet,
    getValidators,
    getDelegators,
    getPossibleRewardDelegators,
    getGrantDelegators,
    getExecuteMsg,
    getGasEstimation,
    sendAuthzDelegateExecute
  }
}

export { firmaREStakeInterval };