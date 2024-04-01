import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
import {provider, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {populateDistribute} from "../helpers/populate_helper.js";
import assert from 'assert';
import {sealContract} from "../helpers/seal_helper.js";
import {approveAndFund} from "../helpers/fund_helper.js";
import {getInitialBalances, get_csv_hash, get_chain_hash} from "../helpers/validate_helper.js";
import {rescueFunds} from "../helpers/rescue_helper.js";
const priorBalances = {};
const cacheDir = './cache/';
const balancesLogFilename = `${cacheDir}balances.log.json`;
const stagesCacheFilename = `${cacheDir}stages.json`;
// make cache dir
try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }
}
catch (e) {
  console.error(`Cannot create directory for cache ${e.message}`);
}

const STAGE_INIT = 0;
const STAGE_POPULATED = 1;
const STAGE_SEALED = 2;
const STAGE_FUNDED = 3;
const STAGE_RESCUED = 5;
const write_stage_cache = (stage_cache) => {
  fs.writeFileSync(stagesCacheFilename, JSON.stringify(stage_cache));
}
const read_stage_cache = () => {
  let json;
  if (fs.existsSync(stagesCacheFilename)){
    json = fs.readFileSync(stagesCacheFilename);
  }
  let cache;
  if (!json){
    console.log(`First run, generating cache file`);
    cache = {
      current_stage: STAGE_INIT,
      stage_snapshots: []
    };
  }
  else {
    cache = JSON.parse(json);
  }
  return cache;
}
const stage_cache = read_stage_cache();

(async () => {
  let filename = 'locks-collated.csv';

  let snapshot
  try {
    stage_cache.stage_snapshots[STAGE_INIT] = await provider.send('evm_snapshot', []);
    write_stage_cache(stage_cache);
    // console.log("Snapshot taken, reading initial balances")
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

    stage_cache.current_stage = STAGE_POPULATED;
    stage_cache.stage_snapshots[STAGE_POPULATED] = await provider.send('evm_snapshot', []);
    write_stage_cache(stage_cache);
    console.log("0 - Populated funds")
  
// This stage is irrevelant for the rescue test
//    const csv_hash = await get_csv_hash(filename);
//    const chain_hash = await get_chain_hash();
//    assert(csv_hash === chain_hash, `Chain hash ${chain_hash} does not match CSV hash ${csv_hash}`)
//    console.log("1 - Validate on-chain & off-chain data")

    await sealContract(distributeOwner);
    console.log("2 - Sealed contract")

    stage_cache.current_stage = STAGE_SEALED;
    stage_cache.stage_snapshots[STAGE_SEALED] = await provider.send('evm_snapshot', []);
    write_stage_cache(stage_cache);

    await approveAndFund(process.env.DISTRIBUTE_CONTRACT_OWNER, msigOwner);
    stage_cache.current_stage = STAGE_FUNDED;
    stage_cache.stage_snapshots[STAGE_FUNDED] = await provider.send('evm_snapshot', []);
    write_stage_cache(stage_cache);
    console.log("3 - Approved and funded contract (msig stage)")

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


    const msigETHBalancePrior = await provider.getBalance(process.env.MSIG);
    const msigUSDBBalancePrior = await usdb_contract.balanceOf(process.env.MSIG);
    const msigWETHBalancePrior = await weth_contract.balanceOf(process.env.MSIG);

    await rescueFunds(msigOwner);

    const distributeETHBalanceRescue = await provider.getBalance(process.env.DISTRIBUTE_CONTRACT);
    const distributeUSDBBalanceRescue = await usdb_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
    const distributeWETHBalanceRescue = await weth_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
    
    assert( 
        distributeETHBalanceRescue.toString() === '0' &&
        distributeUSDBBalanceRescue.toString() === '0' &&
        distributeWETHBalanceRescue.toString() === '0',
        `Distribute contract post rescue is not empty: ` +
        `${distributeETHBalance.toString()} ${distributeUSDBBalance.toString()} ${distributeWETHBalance.toString()} ` +
        `should be ${process.env.ETH_QUANTITY} ${process.env.USDB_QUANTITY} ${process.env.WETH_QUANTITY}`
    );

    const msigETHBalancePost = await provider.getBalance(process.env.MSIG);
    const msigUSDBBalancePost = await usdb_contract.balanceOf(process.env.MSIG);
    const msigWETHBalancePost = await weth_contract.balanceOf(process.env.MSIG);
    
    const ethDelta = BigInt(msigETHBalancePost) - BigInt(msigETHBalancePrior);
    const ethLowerBound = BigInt(process.env.ETH_QUANTITY) * BigInt(999) / BigInt(1000);
    const ethUpperBound = BigInt(process.env.ETH_QUANTITY) * BigInt(1001) / BigInt(1000);
    assert(ethDelta >= ethLowerBound && ethDelta <= ethUpperBound, `MSIG contract has incorrect eth delta ${ethDelta.toString()} should be ${process.env.ETH_QUANTITY}`);

    const usdbDelta = BigInt(msigUSDBBalancePost) - BigInt(msigUSDBBalancePrior);
    const usdbLowerBound = BigInt(process.env.USDB_QUANTITY) * BigInt(999) / BigInt(1000);
    const usdbUpperBound = BigInt(process.env.USDB_QUANTITY) * BigInt(1001) / BigInt(1000);
    assert(usdbDelta >= usdbLowerBound && usdbDelta <= usdbUpperBound, `MSIG contract has incorrect usdb delta ${usdbDelta.toString()} should be ${process.env.USDB_QUANTITY}`);

    const wethDelta = BigInt(msigWETHBalancePost) - BigInt(msigWETHBalancePrior);
    const wethLowerBound = BigInt(process.env.WETH_QUANTITY) * BigInt(999) / BigInt(1000);
    const wethUpperBound = BigInt(process.env.WETH_QUANTITY) * BigInt(1001) / BigInt(1000);
    assert(wethDelta >= wethLowerBound && wethDelta <= wethUpperBound, `MSIG contract has incorrect weth delta ${wethDelta.toString()} should be ${process.env.WETH_QUANTITY}`);

    console.log('Rescue successful')
    stage_cache.current_stage = STAGE_RESCUED;
    stage_cache.stage_snapshots[STAGE_RESCUED] = await provider.send('evm_snapshot', []);
    write_stage_cache(stage_cache);

  } catch (e) {
    console.error(e);
    //await provider.send('evm_revert', [snapshot]);
    process.exit(1);
  }
  // await provider.send('evm_revert', [snapshot]);
  // console.log("Snapshot restored")
})();
