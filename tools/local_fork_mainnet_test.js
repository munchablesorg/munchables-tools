/*
Populates the DISTRIBUTE_CONTRACT with data from the locks-collated.csv file
 */

import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
import { parse } from 'csv-parse';
import { ethers } from "ethers";
import {distribute_contract, provider, usdb_contract, weth_contract} from "../lib/contracts.js";
import {populateDistribute} from "./populate_distribute_helper.js";
import {fundDistribute} from "./fund_distribute_helper.js";
import assert from 'assert';
import cliProgress from "cli-progress";
import {ACCOUNT_COUNT} from "../lib/env.js";
// put into memory balances prior to distribution
const priorBalances = {};

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const getInitialBalances = async (filename) => {
  console.log(`Loading initial balances ${filename}`);

  progressBar.start(ACCOUNT_COUNT, 0); // 3223 = lines in final collated csv
  const parser = fs
      .createReadStream(filename)
      .pipe(parse({}));
  try {
    for await (const record of parser) {
      const [account, quantity, token_type] = record;
      let balance; 
      if (token_type === "2") {
          balance = await usdb_contract.balanceOf(account);
      } else if (token_type === "3") {
          balance = await weth_contract.balanceOf(account);
      } else if (token_type === "1") {
          balance = await provider.getBalance(account);
      } else {
          throw new Error(`Unknown token type ${token_type}`);
      }
      priorBalances[account] = balance;
      progressBar.update(progressBar.value + 1);
    }
  }
  catch(e) {
    throw new Error(e);
  }
  progressBar.stop();
}

const validateFinalBalances = async (filename) => {
  console.log(`Verifying ${filename}`);

  const parser = fs
      .createReadStream(filename)
      .pipe(parse({}));
  try {
    const distributeETHBalance = await provider.getBalance(process.env.DISTRIBUTE_CONTRACT);
    const distributeUSDBBalance = await usdb_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
    const distributeWETHBalance = await weth_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
    assert(distributeETHBalance.toString() === "0" && distributeUSDBBalance.toString() === "0" && distributeWETHBalance.toString() === "0", `Distribute contract has remaining balance ${distributeETHBalance.toString()} ${distributeUSDBBalance.toString()} ${distributeWETHBalance.toString()}`);

    console.log("Validated ending state of distribution contract")
    progressBar.start(ACCOUNT_COUNT, 0); // 3223 = lines in final collated csv
    for await (const record of parser) {
      const [account, quantity, token_type] = record;
      let balance; 
      if (token_type === "2") {
          balance = await usdb_contract.balanceOf(account);
      } else if (token_type === "3") {
          balance = await weth_contract.balanceOf(account);
      } else if (token_type === "1") {
          balance = await provider.getBalance(account);
      } else {
          throw new Error(`Unknown token type ${token_type}`);
      }
      assert((balance - priorBalances[account]).toString() === quantity, `Balance mismatch for account ${account} expected ${quantity} got ${balance.toString()}`);
      progressBar.update(progressBar.value + 1);
    }
  }
  catch(e) {
    throw new Error(e);
  }
  progressBar.stop();
}

(async () => {
  let filename = 'locks-collated.csv';

  let snapshot
  try {
    snapshot = await provider.send('evm_snapshot', []);
    //await getInitialBalances(filename);
    console.log("Snapshot taken")
    await provider.send("hardhat_setBalance", [
      process.env.DISTRIBUTE_CONTRACT_OWNER,
      // doesn't really matter how much, just needs to be enough for txn fees
      ethers.utils.hexlify(BigInt(process.env.ETH_QUANTITY)),
    ])
    await provider.send('hardhat_impersonateAccount', [process.env.DISTRIBUTE_CONTRACT_OWNER]);
    await provider.send('hardhat_impersonateAccount', [process.env.MSIG]);
  } catch (e) {
    await provider.send('evm_revert', [snapshot]);
    throw new Error(e)
  }

  const distributeOwner = provider.getUncheckedSigner(process.env.DISTRIBUTE_CONTRACT_OWNER);
  const msigOwner = provider.getUncheckedSigner(process.env.MSIG);
  console.log("Impersonated accounts")
  try {
    // Populate and distribute funds
    await populateDistribute(filename, distributeOwner);
    console.log("Populated funds")
    const sealRes = await distribute_contract.connect(distributeOwner).seal();
    console.log(`Sealed funds ${sealRes.hash}`)
    console.log("Impersonated msig owner")

    const approveUSDB = await usdb_contract.connect(msigOwner).approve(process.env.DISTRIBUTE_CONTRACT, ethers.utils.hexlify(BigInt(process.env.USDB_QUANTITY)));
    console.log(`Approved USDB ${approveUSDB.hash}`)
    const approveWETH = await weth_contract.connect(msigOwner).approve(process.env.DISTRIBUTE_CONTRACT, ethers.utils.hexlify(BigInt(process.env.WETH_QUANTITY)));
    console.log(`Approved WETH ${approveWETH.hash}`)
    const sendFunds = await distribute_contract.connect(msigOwner).fund({value: process.env.ETH_QUANTITY});
    console.log(`Funds sent to contract ${sendFunds.hash}`)

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

    await fundDistribute();
    console.log("Funds distributed")

    // Verify all final balances are the same
    await validateFinalBalances(filename);
    console.log("Fully validated end balances")
  } catch (e) {
    console.error(e);
    await provider.send('evm_revert', [snapshot]);
    process.exit(1);
  }
  await provider.send('evm_revert', [snapshot]);
  console.log("Snapshot restored")
})();