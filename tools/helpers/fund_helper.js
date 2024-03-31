import {distribute_contract, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {BigNumber} from "ethers";

export const approveAndFund = async (customSigner = null) => {
  const uc = (customSigner) ? usdb_contract.connect(customSigner) : usdb_contract;
  const wc = (customSigner) ? weth_contract.connect(customSigner) : weth_contract;

  console.log("Approving and funding")
  const approveUSDB = await uc.approve(process.env.DISTRIBUTE_CONTRACT, BigNumber.from(process.env.USDB_QUANTITY));
  console.log(`Approved USDB ${approveUSDB.hash}`)
  const approveWETH = await wc.approve(process.env.DISTRIBUTE_CONTRACT, BigNumber.from(process.env.WETH_QUANTITY));
  console.log(`Approved WETH ${approveWETH.hash}`)

  let sendFunds;
  if (customSigner){
    sendFunds = await distribute_contract.connect(customSigner).fund({value: process.env.ETH_QUANTITY});
  }
  else {
    sendFunds = await distribute_contract.fund({value: process.env.ETH_QUANTITY});
  }
  console.log(`Funds sent to contract ${sendFunds.hash}`)
}


