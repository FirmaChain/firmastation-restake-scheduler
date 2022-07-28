import { GrantStakingData } from "@firmachain/firma-js/dist/sdk/firmachain/authz";

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

  return {
    getStakeAuthzIdx,
  }
}


export { RestakeSDKHelper }