import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import {
  AuthorizationType,
  FirmaConfig,
  FirmaSDK,
  FirmaUtil,
  GrantStakingData,
  StakingTxClient
} from '@firmachain/firma-js';
import {
  RESTAKE_FAILED_CALC_GAS,
  RESTAKE_FAILED_EXECUTE,
  RESTAKE_FAILED_INSUFFICIENT,
  RESTAKE_SUCCESS
} from 'src/constants/restake.constant';
import { FirmaWalletService } from '@firmachain/firma-js/dist/sdk/FirmaWalletService';
import { StakingValidatorStatus } from '@firmachain/firma-js/dist/sdk/FirmaStakingService';
import { Any } from '@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any';
import { RestakeMessage, Target, TransactionResult } from './restake.interface';

@Injectable()
export class RestakeService {
  private firmaSDK: FirmaSDK;
  private restakeWallet: FirmaWalletService;
  private restakeAddress: string;
  private minimumRewards: number;
  private batchCount: number;
  private maxRetryCount: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.initializeRestake();
  }

  private async initializeRestake() {
    const firmaConfig = this.configService.get<string>('NODE_ENV');
    const restakeMnemonic = this.configService.get<string>('RESTAKE_MNEMONIC');

    switch (firmaConfig.toLowerCase()) {
      case 'production':
        this.firmaSDK = new FirmaSDK(FirmaConfig.MainNetConfig);
        break;

      case 'development':
        this.firmaSDK = new FirmaSDK(FirmaConfig.TestNetConfig);
        break;

      case 'test':
        this.firmaSDK = new FirmaSDK({
          chainID: "roma-1",
          rpcAddress: "http://192.168.20.108:26657",
          restApiAddress: "http://192.168.20.108:1317",
          ipfsNodeAddress: "http://192.168.20.120",
          ipfsNodePort: 5001,
          ipfsWebApiAddress: "http://192.168.20.120:8080",
          hdPath: "m/44'/7777777'/",
          prefix: "firma",
          defaultFee: 20000,
          defaultGas: 200000,
          denom: "ufct",
          isShowLog: false,
        });
        break;
    }

    this.restakeWallet = await this.firmaSDK.Wallet.fromMnemonic(restakeMnemonic);
    this.restakeAddress = await this.restakeWallet.getAddress();

    this.minimumRewards = this.configService.get<number>('RESTAKE_MINIMUM_REWARD');
    this.batchCount = this.configService.get<number>('RESTAKE_BATCH_COUNT');
    this.maxRetryCount = this.configService.get<number>('RESTAKE_RETRY_COUNT');
  }

  async startRestake() {
    // restake process
    const delegatorTargets = await this.getDelegatorTargets();
    const allowedMessages = await this.getAllowedMessages(delegatorTargets);
    
    const { txResults, failedTxResults } = await this.getExecuteTxResults(allowedMessages);

    // retry restake process
    if (failedTxResults.length > 0) {
      const retryTxResults = await this.retryRestakeProcess(failedTxResults);
      txResults.push(...retryTxResults);
    }

    return txResults;
  }

  private async getDelegatorTargets() {
    const validatorAddresses = await this.getValidatorAddresses();

    let delegatorTargets: Target[] = [];

    for (let i = 0; i < validatorAddresses.length; i++) {
      const validatorAddress = validatorAddresses[i];
      const delegateAddresses = await this.getDelegateAddresses(validatorAddress);

      for (let j = 0; j < delegateAddresses.length; j++) {
        delegatorTargets.push({
          validatorAddress,
          delegatorAddress: delegateAddresses[j]
        })
      }
    }

    return delegatorTargets;
  }

  private async getAllowedMessages(delegatorTargets: Target[]) {
    let allowedMessages: RestakeMessage[] = [];
    for (let i = 0; i < delegatorTargets.length; i++) {
      const allowedMessage = await this.getAllowedExecuteMessage(delegatorTargets[i]);
      if (allowedMessage !== null) {
        allowedMessages.push(allowedMessage);
      }
    }

    return allowedMessages;
  }

  private async getAllowedExecuteMessage(delegatorTarget: Target) {
    const { validatorAddress, delegatorAddress } = delegatorTarget;

    const withdrawAddress = await this.getWithdrawAddress(delegatorAddress);
    if (withdrawAddress !== delegatorAddress) return null;

    const rewards = await this.getDelegateRewards(validatorAddress, delegatorAddress);
    if (rewards === 0) return null;

    const isAuthzStakingGrant = await this.checkAuthzStakingGrant(validatorAddress, delegatorAddress);
    if (isAuthzStakingGrant === false) return null;

    const transactionMessage = await this.makeTransactionMessage(validatorAddress, delegatorAddress, rewards);
    if (transactionMessage === null) return null;

    return {
      message: transactionMessage,
      target: {
        validatorAddress: validatorAddress,
        delegatorAddress: delegatorAddress,
        rewards: rewards
      }
    }
  }

  private async getExecuteTxResults(allowedMessages: RestakeMessage[]) {
    let txResults: TransactionResult[] = [];
    let failedTxResults: TransactionResult[] = [];

    if (allowedMessages.length === 0) {
      return { txResults, failedTxResults }
    }
    
    const chunkMessages = this.chunkMessages(allowedMessages, this.batchCount);
    for (let i = 0; i < chunkMessages.length; i++) {
      const chunkMessage = chunkMessages[i];
      if (chunkMessage.length === 0) continue;

      let messages: Any[] = [];
      let targets: Target[] = [];

      chunkMessage.forEach(item => {
        messages.push(item.message);
        targets.push(item.target);
      });

      const { errorType, transactionResult, dateTime } = await this.getTransactionResult(messages);
      if (errorType === RESTAKE_SUCCESS || errorType === RESTAKE_FAILED_INSUFFICIENT) {
        txResults.push({
          errorType: errorType,
          dateTime: dateTime,
          transactionResult: transactionResult,
          retryCount: 0,
          originRestakeTargets: targets,
          finalRestakeTargets: targets
        });
      } else {
        failedTxResults.push({
          errorType: errorType,
          dateTime: dateTime,
          transactionResult: transactionResult,
          retryCount: 0,
          originRestakeTargets: targets,
          finalRestakeTargets: targets
        })
      }
    }

    return {
      txResults, failedTxResults
    }
  }

  private async getTransactionResult(messages: Any[]) {
    const nowDate = new Date().toISOString();

    const gasEstimation = await this.calcGasEstimation(messages);
    if (gasEstimation === 0) {
      return {
        errorType: RESTAKE_FAILED_CALC_GAS,
        dateTime: nowDate,
        transactionResult: null
      }
    }

    const balance = await this.getRestakeWalletBalance();
    if (balance < (gasEstimation * 0.1)) {
      return {
        errorType: RESTAKE_FAILED_INSUFFICIENT,
        dateTime: nowDate,
        transactionResult: null
      }
    }

    const txResult = await this.executeMessages(messages, gasEstimation);
    if (txResult === null) {
      return {
        errorType: RESTAKE_FAILED_EXECUTE,
        dateTime: nowDate,
        transactionResult: null
      }
    }

    return {
      errorType: RESTAKE_SUCCESS,
      dateTime: nowDate,
      transactionResult: txResult
    }
  }

  private async retryRestakeProcess(failedTxResults: TransactionResult[]) {
    let retryTransactionResults: TransactionResult[] = [];

    for (let i = 0; i < failedTxResults.length; i++) {
      const failedTxResult = failedTxResults[i];

      let retryCount = 1;
      let retryTargets = failedTxResult.finalRestakeTargets;

      while (retryTargets.length !== 0) {
        const retryAllowedMessages = await this.getAllowedMessages(retryTargets);
        let messages: Any[] = [];
        let targets: Target[] = [];

        retryAllowedMessages.forEach(item => {
          messages.push(item.message);
          targets.push(item.target);
        });

        const { errorType, transactionResult, dateTime } = await this.getTransactionResult(messages);

        retryCount++;
        if (retryCount > this.maxRetryCount || errorType === RESTAKE_SUCCESS || errorType === RESTAKE_FAILED_INSUFFICIENT) {
          retryTransactionResults.push({
            errorType: errorType,
            dateTime: dateTime,
            transactionResult: transactionResult,
            retryCount: retryCount,
            originRestakeTargets: retryTargets,
            finalRestakeTargets: targets
          });
        } else {
          this.logger.info(`❌ Failed restake : ${errorType}`);
        }
      }
    }

    return retryTransactionResults;
  }


  /*
    Functions that query data using a FirmaJS(SDK).
  */

  // Get validator addresses
  private async getValidatorAddresses() {
    try {
      const validatorInfo = await this.firmaSDK.Staking.getValidatorList(StakingValidatorStatus.BONDED);

      let validatorList = validatorInfo.dataList;
      let paginationKey = validatorInfo.pagination.next_key;

      let validatorAddresses: string[] = [];

      while (paginationKey !== null) {
        const nextValidatorInfo = await this.firmaSDK.Staking.getValidatorList(StakingValidatorStatus.BONDED, paginationKey);

        validatorList.push(...nextValidatorInfo.dataList);
        paginationKey = nextValidatorInfo.pagination.next_key;
      }

      for (let i = 0; i < validatorList.length; i++) {
        const validator = validatorList[i];

        if (validator.jailed) continue;
        else validatorAddresses.push(validator.operator_address);
      }

      this.logger.info(`✅ Success get validator addresses`);
      return validatorAddresses;
    } catch (e) {
      this.logger.error(`❌ Failed get validator addresses : ${e}`);
      return [];
    }
  }

  // Get delegator addresses
  private async getDelegateAddresses(validatorAddress: string) {
    try {
      const delegatorInfo = await this.firmaSDK.Staking.getDelegationListFromValidator(validatorAddress);

      let delegatorList = delegatorInfo.dataList;
      let paginationKey = delegatorInfo.pagination.next_key;

      let delegatorAddresses: string[] = [];

      while (paginationKey !== null) {
        const nextDelegatorInfo = await this.firmaSDK.Staking.getDelegationListFromValidator(validatorAddress, paginationKey);
        delegatorList.push(...nextDelegatorInfo.dataList);

        paginationKey = nextDelegatorInfo.pagination.next_key;
      }

      for (let i = 0; i < delegatorList.length; i++) {
        delegatorAddresses.push(delegatorList[i].delegation.delegator_address);
      }

      return delegatorAddresses;
    } catch (e) {
      this.logger.error(`❌ Failed get validator addresses : ${e}`);
      return [];
    }
  }

  // Gets the delegators deposited with the validator.
  private async getDelegateRewards(validatorAddress: string, delegatorAddress: string) {
    try {
      const rewardInfo = await this.firmaSDK.Distribution.getRewardInfo(delegatorAddress, validatorAddress);
      const fctString = FirmaUtil.getFCTStringFromUFCT(Number(rewardInfo));
      const ufctString = FirmaUtil.getUFCTStringFromFCT(Number(fctString));
      const rewards = Number(ufctString);

      if (rewards >= this.minimumRewards) {
        return rewards;
      } else {
        return 0;
      }
    } catch (e) {
      this.logger.error(`❌ Failed get rewards : ${e}`);
      return 0;
    }
  }

  // Check the delegate's permissions.
  private async checkAuthzStakingGrant(validatorAddress: string, delegatorAddress: string) {
    try {
      const grantInfo = await this.firmaSDK.Authz.getStakingGrantData(delegatorAddress, this.restakeAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE);
      
      let grantList = grantInfo.dataList;
      let paginationKey = grantInfo.pagination.next_key;

      while (paginationKey !== '') {
        const nextGrantInfo = await this.firmaSDK.Authz.getStakingGrantData(delegatorAddress, this.restakeAddress, AuthorizationType.AUTHORIZATION_TYPE_DELEGATE, paginationKey);
        
        grantList.push(...nextGrantInfo.dataList);
        paginationKey = nextGrantInfo.pagination.next_key;
      }
      
      const typeIdx = this.getStakeAuthorizationTypeIdx(grantList);
      if (typeIdx !== -1) {
        const allowList = grantList[typeIdx].authorization.allow_list.address;
        const maxTokens = grantList[typeIdx].authorization.max_tokens;

        if (!allowList.includes(validatorAddress) || maxTokens !== null) {
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    } catch (e) {
      this.logger.error(`❌ Failed check staking grant. [${validatorAddress} / ${delegatorAddress}] : ${e}`);
      return false;
    }
  }

  // Gets the widthdraw address of delegator.
  private async getWithdrawAddress(delegatorAddress: string) {
    try {
      return await this.firmaSDK.Distribution.getWithdrawAddress(delegatorAddress);
    } catch (e) {
      this.logger.error(`❌ Failed get withdraw. [${delegatorAddress}] : ${e}`);
      return "";
    }
  }

  // Generates a transaction message.
  private async makeTransactionMessage(validatorAddress: string, delegatorAddress: string, rewards: number) {
    try {
      const delegateMessage = StakingTxClient.msgDelegate({
        delegatorAddress: delegatorAddress,
        validatorAddress: validatorAddress,
        amount: { denom: this.firmaSDK.Config.denom, amount: rewards.toString() }
      });

      const anyData = FirmaUtil.getAnyData(StakingTxClient.getRegistry(), delegateMessage);
      return anyData;
    } catch (e) {
      this.logger.error(`❌ Failed make transaction message. [${validatorAddress} / ${delegatorAddress} / ${rewards}] : ${e}`);
      return null;
    }
  }

  // Estimate and get the gas cost of the transaction.
  private async calcGasEstimation(messages: Any[]) {
    try {
      const gasEstimation = await this.firmaSDK.Authz.getGasEstimationExecuteAllowance(this.restakeWallet, messages);
      return gasEstimation;
    } catch (e) {
      this.logger.error(`❌ Failed calc gas estimation message. : ${e}`);
      return 0;
    }
  }

  // Gets the amount of money you own in your wallet.
  private async getRestakeWalletBalance() {
    try {
      const balance = await this.firmaSDK.Bank.getBalance(this.restakeAddress);
      return Number(balance);
    } catch (e) {
      this.logger.error(`❌ Failed get restake wallet balance. : ${e}`);
      return 0;
    }
  }

  // Execute a transaction.
  private async executeMessages(messages: Any[], gasEstimation: number) {
    const fees = Math.ceil(gasEstimation * 0.1);

    try {
      const txResult = await this.firmaSDK.Authz.executeAllowance(this.restakeWallet, messages, { fee: fees, gas: gasEstimation });
      return txResult;
    } catch (e) {
      this.logger.error(`❌ Failed execute allowance : ${e}`);
      return null;
    }
  }

  /*
    Functions that support restake
  */

  // Check authorization type
  private getStakeAuthorizationTypeIdx(grantList: GrantStakingData[]) {
    for (let i = 0; i < grantList.length; i++) {
      if (grantList[i].authorization["@type"] === "/cosmos.staking.v1beta1.StakeAuthorization") {
        return i;
      }
    }

    return -1;
  }

  // Chunk the arrangement according to the batch size.
  private chunkMessages(messages: RestakeMessage[], chunkSize: number) {
    let result: RestakeMessage[][] = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
      let chunk = messages.slice(i, i + chunkSize);
      result.push(chunk);
    }

    return result;
  }

  getChainId() {
    return this.firmaSDK.Config.chainID;
  }
}
