import {distribute_contract} from "../../lib/contracts.js";
export const sealContract = async (customSigner = null) => {
  let sealRes;
  if (customSigner){
    sealRes = await distribute_contract.connect(customSigner).seal();
  }
  else {
    sealRes = await distribute_contract.seal();
  }
  console.log(`Sealed funds ${sealRes.hash}`)
}


