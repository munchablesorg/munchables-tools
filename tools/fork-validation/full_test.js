/*
Populates the DISTRIBUTE_CONTRACT with data from the locks-collated.csv file
 */

import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
import { parse } from 'csv-parse';
import {ethers} from "ethers";
import {provider, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {populateDistribute} from "../helpers/populate_helper.js";
import {distributeAll} from "../helpers/distribute_helper.js";
import assert from 'assert';
import {sealContract} from "../helpers/seal_helper.js";
import {approveAndFund} from "../helpers/fund_helper.js";
import {getInitialBalances, validateFinalBalances} from "../helpers/validate_helper.js";
// put into memory balances prior to distribution
const priorBalances = {};
const cacheDir = './cache/';
const balancesLogFilename = `${cacheDir}balances.log.json`;
// make cache dir
try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }
}
catch (e) {
  console.error(`Cannot create directory for cache ${e.message}`);
}


(async () => {
  let filename = 'locks-collated.csv';

  let snapshot
  try {
    snapshot = await provider.send('evm_snapshot', []);
    console.log("Snapshot taken, reading initial balances")
    try {
      await getInitialBalances(filename);
    }
    catch (e){
      console.error(`Failure during getInitialBalances ${e.message}`);
      throw e;
    }

    await provider.send("hardhat_setBalance", [
      process.env.DISTRIBUTE_CONTRACT_OWNER,
      // doesn't really matter how much, just needs to be enough for txn fees
      BigInt(process.env.ETH_QUANTITY).toString(),
    ])
    await provider.send('hardhat_impersonateAccount', [process.env.DISTRIBUTE_CONTRACT_OWNER]);
    await provider.send('hardhat_impersonateAccount', [process.env.MSIG]);
  } catch (e) {
    await provider.send('evm_revert', [snapshot]);
    throw new Error(e)
  }

  const distributeOwner = await provider.getSigner(process.env.DISTRIBUTE_CONTRACT_OWNER);
  const msigOwner = await provider.getSigner(process.env.MSIG);
  console.log("Impersonated accounts")
  try {
    // Populate and distribute funds
    try {
      await populateDistribute(filename, distributeOwner);
    }
    catch (e){
      console.error(`Error populating ${e.message}`)
      process.exit(1)
    }

    console.log("Populated funds")
    await sealContract(distributeOwner);

    await approveAndFund(process.env.DISTRIBUTE_CONTRACT_OWNER, msigOwner);

    const distributeETHBalance = await provider.getBalance(process.env.DISTRIBUTE_CONTRACT);
    const distributeUSDBBalance = await usdb_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
    const distributeWETHBalance = await weth_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
    assert(
        distributeETHBalance.toString() === process.env.ETH_QUANTITY &&
        distributeUSDBBalance.toString() === process.env.USDB_QUANTITY &&
        distributeWETHBalance.toString() === process.env.WETH_QUANTITY,
        `Distribute contract has incorrect balance ` +
        `${distributeETHBalance.toString()} ${distributeUSDBBalance.toString()} ${distributeWETHBalance.toString()} ` +
        `should be ${process.env.ETH_QUANTITY} ${process.env.USDB_QUANTITY} ${process.env.WETH_QUANTITY}`
    );

    await distributeAll(distributeOwner);
    console.log("Funds distributed")

    // Verify all final balances are the same
    await validateFinalBalances(filename, balancesLogFilename);
    console.log("Fully validated end balances")
  } catch (e) {
    console.error(e);
    //await provider.send('evm_revert', [snapshot]);
    process.exit(1);
  }
  await provider.send('evm_revert', [snapshot]);
  console.log("Snapshot restored")
})();
