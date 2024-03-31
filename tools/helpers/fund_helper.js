import {distribute_contract, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {BigNumber} from "ethers";

export const approveAndFund = async (customSigner = null) => {
  const uc = (customSigner) ? usdb_contract.connect(customSigner) : usdb_contract;
  const wc = (customSigner) ? weth_contract.connect(customSigner) : weth_contract;

  const eth_qty = BigNumber.from(process.env.ETH_QUANTITY);
  const usdb_qty = BigNumber.from(process.env.USDB_QUANTITY);
  const weth_qty = BigNumber.from(process.env.WETH_QUANTITY);

  console.log("Approving and funding")
  const approveUSDB = await uc.approve(process.env.DISTRIBUTE_CONTRACT, usdb_qty);
  console.log(`Approved USDB ${approveUSDB.hash}`)
  const approveWETH = await wc.approve(process.env.DISTRIBUTE_CONTRACT, weth_qty);
  console.log(`Approved WETH ${approveWETH.hash}`)

  let sendFunds;
  if (customSigner){
    sendFunds = await distribute_contract.connect(customSigner).fund({value: eth_qty});
  }
  else {
    sendFunds = await distribute_contract.fund({value: eth_qty});
  }
  console.log(`Funds sent to contract ${sendFunds.hash}`)
}


