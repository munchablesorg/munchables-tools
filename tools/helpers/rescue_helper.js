import {distribute_contract} from "../../lib/contracts.js";
export const rescueFunds = async (customSigner = null) => {
  let rescue;
  if (customSigner){
    rescue = await distribute_contract.connect(customSigner).rescue();
  }
  else {
    rescue = await distribute_contract.rescue();
  }
  console.log(`Rescue funds ${rescue.hash}`)
}


