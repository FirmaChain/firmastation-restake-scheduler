import { FirmaConfig } from "@firmachain/firma-js";
import { PRODUCTION, DEVELOPMENT, TEST } from "./defines/enviroment";

export const APP_PORT = 0;

export const MONGODB_URI = '';

export const RESTAKE_MNEMONIC = '';

export const MINIMUM_UFCT_REWARD_AMOUNT = 0;

export const FREEQUANCY = '';

export const BATCH_TX_COUNT = 0;

export const PRODUCTION_MODE = '';

export const FIRMACHAIN_CONFIG = () => {
  let config: FirmaConfig;
  switch (process.env.enviroment) {
    case PRODUCTION:
      config = FirmaConfig.MainNetConfig;
      break;

    case DEVELOPMENT:
      config = FirmaConfig.TestNetConfig;
      break;

    case TEST:
      config = FirmaConfig.DevNetConfig;
      break;

    default:
      config = {
        chainID: "",
        rpcAddress: ":26657",
        restApiAddress: ":1317",
        ipfsNodeAddress: "",
        ipfsNodePort: 0,
        ipfsWebApiAddress: "",
        hdPath: "m/44'/7777777'/",
        prefix: "firma",
        defaultFee: 20000,
        defaultGas: 200000,
        denom: "ufct",
        isShowLog: true,
      }
      break;
  }

  return config;
}