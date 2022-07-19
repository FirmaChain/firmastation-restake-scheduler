import { ValidatorDataType } from "@firmachain/firma-js";
import { GrantStakingData } from "@firmachain/firma-js/dist/sdk/firmachain/authz";

const FirmaSDKHelper = () => {

  function getStakeAuthzIdx(_grantStakingData: GrantStakingData[]) {
    let isCheck: number = -1;

    for (let i = 0; i < _grantStakingData.length; i++) {
      if (_grantStakingData[i].authorization["@type"] === "/cosmos.staking.v1beta1.StakeAuthorization") {
        isCheck = i;
      }
    }

    return isCheck;
  }

  function getNotJailedValoperAddresses(_validators: ValidatorDataType[]): string[] {
    const validators = _validators.filter(elem => elem.jailed !== true);
    const valoperAddresses: string[] = [];

    for (let i = 0; i < validators.length; i++) {
      valoperAddresses.push(validators[i].operator_address);
    }

    return valoperAddresses;
  }

  return {
    getStakeAuthzIdx,
    getNotJailedValoperAddresses,
  }
}


export { FirmaSDKHelper }