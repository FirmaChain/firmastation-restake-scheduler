import { GrantStakingData } from "@firmachain/firma-js/dist/sdk/firmachain/authz"
import { IRoundDetail } from "./dbTypes"

export interface IFreequancy {
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
  freequancy: string,
  minimumRewards: number,
  round: number,
  restakeAmount: string,
  feesAmount: string,
  userMsgCount: number,
  nextRoundDateTime: string,
  expiryDate: string
}

export interface IRestakeStatusData {
  round: number,
  restakeAmount: number,
  feesAmount: number,
  restakeCount: number,
  nextRoundDateTime: string,
  roundDatas: IRestakeRoundDatas[]
}

export interface IRestakeRoundDatas {
  round: number,
  restakeAmount: number,
  feesAmount: number,
  restakeCount: number,
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
  excuteData: any[]
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