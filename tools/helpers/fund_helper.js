import {distribute_contract, usdb_contract, weth_contract} from "../../lib/contracts.js";
export const approveAndFund = async (distributor, customSigner = null) => {
  const uc = (customSigner) ? usdb_contract.connect(customSigner) : usdb_contract;
  const wc = (customSigner) ? weth_contract.connect(customSigner) : weth_contract;
  const dc = (customSigner) ? distribute_contract.connect(customSigner) : distribute_contract;

  const eth_qty = BigInt(process.env.ETH_QUANTITY);
  const usdb_qty = BigInt(process.env.USDB_QUANTITY);
  const weth_qty = BigInt(process.env.WETH_QUANTITY);

  console.log("Approving and funding")
  const approveUSDB = await uc.approve(process.env.DISTRIBUTE_CONTRACT, usdb_qty);
  console.log(`Approved USDB ${approveUSDB.hash}`)
  const approveWETH = await wc.approve(process.env.DISTRIBUTE_CONTRACT, weth_qty);
  console.log(`Approved WETH ${approveWETH.hash}`)

  const sendFunds = await dc.fund(distributor, {value: eth_qty});
  console.log(`Funds sent to contract ${sendFunds.hash}`)
}


