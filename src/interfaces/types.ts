import { Any } from "@firmachain/firma-js/dist/sdk/firmachain/google/protobuf/any";
import { GrantStakingData } from "@firmachain/firma-js/dist/sdk/firmachain/authz"

import { IRoundDetail } from "./dbTypes"
import { BroadcastTxFailure, BroadcastTxSuccess } from "@firmachain/firma-js/dist/sdk/firmachain/common/stargateclient";

export interface IFrequency {
  text: string,
  cronExpression: string,
  nextTimeValue: number
}

export interface IDelegators {
  valoperAddress: string,
  delegators: string[]
}

export interface IDelegatorsReward {
  address: string,
  rewards: number
}

export interface IGrantsDelegator {
  address: string,
  grants: GrantStakingData[],
  rewards: number
}

export interface IRestakeInfo {
  frequency: string,
  minimumRewards: number,
  round: number,
  feesAmount: string,
  restakeAmount: string,
  restakeCount: number,
  nextRoundDateTime: string
}

export interface IRestakeStatusData {
  round: number,
  restakeAmount: number,
  feesAmount: number,
  restakeCount: number,
  nextRoundDateTime: string,
  roundDatas: IRestakeRoundData[]
}

export interface IRestakeRoundData {
  round: number,
  restakeAmount: number,
  feesAmount: number,
  restakeCount: number,
  startDateTime: string,
  roundDetails: IRoundDetail[]
}

export interface IExecuteGasData {
  gasEstimation: number,
  executeDelegators: any[]
}

export interface IDelegatorRestakeData {
  validatorAddress: string,
  fees: string,
  restakeAmount: string,
  isActive: Boolean,
  lastRound: number,
  lastRoundTimestamp: string
}

export interface IAuthTxData {
  txHash: string,
  gasUsed: number,
  gasWanted: number,
  fees: number,
  height: number,
  rawlog: string,
  dateTime: string
}

export interface ITxMessageAndGasData {
  gasEstimation: number,
  executeData: any[]
}

export interface IStakingParseData {
  delegator: string,
  validator: string,
  amount: number
}

export interface ITransactionParseData {
  gasUsed: number,
  gasWanted: number,
  fees: number,
  txHash: string,
  stakeInfos: IStakingParseData[]
}

export interface IExecuteMsg {
  executeMsg: Any,
  executeTarget: IRestakeTarget
}

export interface IRestakeTarget {
  valoperAddress: string,
  delegatorAddress: string,
  rewards: number
}

export interface IExecuteTxFailure {
  restakeTxResult: BroadcastTxSuccess | BroadcastTxFailure,
  restakeTarget: IRestakeTarget[]
}

export interface IRestakeResult {
  restakeSuccessTxs: (BroadcastTxSuccess | BroadcastTxFailure)[],
  restakeFailedTxs: IExecuteTxFailure[]
}