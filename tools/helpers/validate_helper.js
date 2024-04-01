
import dotenv from 'dotenv';
dotenv.config();

import {distribute_contract, provider, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {sleep} from "../../lib/sleep.js";
import cliProgress from 'cli-progress';
import {ACCOUNT_COUNT} from "../../lib/env.js";
import {createHash} from "crypto";
import fs from "fs";
import {parse} from "csv-parse";
import assert from "assert";

const cacheDir = './cache/';
const balancesLogFilename = `${cacheDir}balances.log.json`;

export const generate_hash = (data, name = '') => {
    const stringified = data.map(d => `${d.account}:${d.quantity.toString()}:${d.token_type}`.toLowerCase());
    const sorted = stringified.sort((a, b) => (a<b)?-1:1);
    const joined = sorted.join(`\n`);

    return createHash('sha256').update(joined).digest('hex');
}

export const get_csv_hash = async (filename) => {
    console.log(`Verifying ${filename}`);

    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    let hash_data = [];
    for await (const record of parser) {
        const [account, quantity, token_type] = record;
        hash_data.push({account, quantity, token_type});
    }

    return generate_hash(hash_data, 'csv');
}
export const get_chain_hash = async () => {
    let start = 0;
    let complete = 0;
    const page_size = 50;
    let all_accounts = [];
    const null_addr = '0x0000000000000000000000000000000000000000';

    console.log(`Syncing accounts from contract ${process.env.DISTRIBUTE_CONTRACT}`);
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(Math.ceil(ACCOUNT_COUNT / page_size), 0); // 3223 = lines in final collated csv

    while (true){
        let new_accounts = await distribute_contract.getAccountList(start);
        // console.log(new_accounts);
        if (new_accounts.find(a => a === null_addr)){
            new_accounts = new_accounts.filter(a => a !== null_addr);
            all_accounts = all_accounts.concat(new_accounts);
            if (new_accounts.length){
                progress_bar.update(++complete);
            }
            break;
        }
        progress_bar.update(++complete);
        all_accounts = all_accounts.concat(new_accounts);
        start += page_size;
        await sleep(50);
    }
    progress_bar.stop();

    console.log(`Collected ${all_accounts.length} accounts from chain, verifying quantities`);

    const hash_data = [];
    let verified = 0;
    const progress_bar_verify = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(all_accounts.length, 0);
    for (let i = 0; i < all_accounts.length; i++){
        const account = all_accounts[i];
        let distribution_data = await distribute_contract.getDistributeData(account);
        progress_bar.update(++verified);
        const quantity = distribution_data._quantity;
        const token_type = distribution_data._token_type;
        if (distribution_data._distributed && process.env.BLAST_ENV === 'mainnet'){
            progress_bar.stop();
            console.log('\x1b[31m%s\x1b[0m', `${account} is marked as already distributed`);
            process.exit(1);
        }
        hash_data.push({account, quantity, token_type});
        await sleep(50);
    }
    progress_bar.stop();

    return generate_hash(hash_data, 'chain');
}


export const getUndistributed = async () => {
    let start = 0;
    let complete = 0;
    const page_size = 50;
    let all_accounts = [];
    const null_addr = '0x0000000000000000000000000000000000000000';

    console.log(`Syncing accounts from contract ${process.env.DISTRIBUTE_CONTRACT}`);
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(Math.ceil(ACCOUNT_COUNT / page_size), 0); // 3223 = lines in final collated csv

    while (true){
        // console.log(`Reading from ${start}`)
        let new_accounts = await distribute_contract.getAccountList(start);
        // console.log(new_accounts);
        if (new_accounts.find(a => a === null_addr)){
            new_accounts = new_accounts.filter(a => a !== null_addr);
            all_accounts = all_accounts.concat(new_accounts);
            if (new_accounts.length){
                progress_bar.update(++complete);
            }
            break;
        }
        progress_bar.update(++complete);
        all_accounts = all_accounts.concat(new_accounts);
        start += page_size;
        await sleep(50);
    }
    progress_bar.stop();

    console.log(`Collected ${all_accounts.length} accounts from chain, verifying sent status`);

    const undistributed = [];
    let distchecked = 0;
    const progress_bar_verify = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(all_accounts.length, 0);
    for (let i = 0; i < all_accounts.length; i++){
        const account = all_accounts[i];
        let distribution_data = await distribute_contract.getDistributeData(account);
        progress_bar.update(++distchecked);
        const distributed = distribution_data._distributed;
        if (!distributed){
            undistributed.push(i);
        }
        await sleep(50);
    }
    progress_bar.stop();

    return undistributed;
}

export const getInitialBalances = async (filename) => {
    let priorBalances = {};
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    console.log(`Loading initial balances from ${filename}`);
    if (fs.existsSync(balancesLogFilename)){
        console.log(`${balancesLogFilename} already exists so skipping snapshot, delete it to re-run`);
        return;
    }

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
            priorBalances[account] = balance.toString();
            progressBar.update(progressBar.value + 1);
        }
    }
    catch(e) {
        throw new Error(e);
    }

    fs.writeFileSync(balancesLogFilename, JSON.stringify(priorBalances));

    progressBar.stop();
    console.log(`Wrote ${Object.values(priorBalances).length} balances to ${balancesLogFilename}`);
}

export const validateFinalBalances = async (filename, balancesLogFilename) => {
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    console.log(`Verifying balances from ${balancesLogFilename}`);
    const json_str = fs.readFileSync(balancesLogFilename);
    const priorBalances = JSON.parse(json_str.toString());
    for (let address in priorBalances){
        priorBalances[address] = BigInt(priorBalances[address]);
    }

    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    try {
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
            const lowerBound = BigInt(quantity) * BigInt(99) / BigInt(100);
            const upperBound = BigInt(quantity) * BigInt(101) / BigInt(100);
            const delta = balance - priorBalances[account]
            // Due to rounding errors, we allow a 1% margin of error
            assert(delta >= lowerBound && delta <= upperBound, `Balance mismatch for account ${account} expected ${quantity} got ${delta.toString()}`);
            progressBar.update(progressBar.value + 1);
        }

        const distributeETHBalance = await provider.getBalance(process.env.DISTRIBUTE_CONTRACT);
        const distributeUSDBBalance = await usdb_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
        const distributeWETHBalance = await weth_contract.balanceOf(process.env.DISTRIBUTE_CONTRACT);
        assert(distributeETHBalance.toString() === "0" &&
                distributeUSDBBalance.toString() === "0" &&
                distributeWETHBalance.toString() === "0",
            `Distribute contract has remaining balance ${distributeETHBalance.toString()} ${distributeUSDBBalance.toString()} ${distributeWETHBalance.toString()}`);
    }
    catch(e) {
        throw new Error(e);
    }
    progressBar.stop();
}
