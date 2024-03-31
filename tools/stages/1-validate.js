/*
Validates that the locks-collated.csv file data and the chain data match exactly
 */

import dotenv from 'dotenv';
dotenv.config();

import {distribute_contract} from "../../lib/contracts.js";
import {sleep} from "../../lib/sleep.js";
import {createHash} from "crypto";
import fs from "fs";
import {parse} from "csv-parse";
import cliProgress from 'cli-progress';
import {ACCOUNT_COUNT} from "../../lib/env.js";

const generate_hash = (data, name = '') => {
    const stringified = data.map(d => `${d.account}:${d.quantity.toString()}:${d.token_type}`.toLowerCase());
    const sorted = stringified.sort((a, b) => (a<b)?-1:1);
    const joined = sorted.join(`\n`);

    return createHash('sha256').update(joined).digest('hex');
}

const get_csv_hash = async (filename) => {
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
const get_chain_hash = async () => {
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

(async () => {
    console.log(`Running on ${process.env.BLAST_ENV}`);
    let filename = 'locks-collated.csv';
    if (process.env.BLAST_ENV === 'testnet'){
        filename = 'locks-collated-test.csv';
    }
    const csv_hash = await get_csv_hash(filename);
    const chain_hash = await get_chain_hash();

    console.log(`CSV Hash : ${csv_hash}\nChain Hash : ${chain_hash}`);
    if (csv_hash === chain_hash) {
        console.log('\x1b[32m%s\x1b[0m', `HASHES MATCH`);
    }
    else {
        console.log('\x1b[31m%s\x1b[0m', `HASHES DO NOT MATCH`);
    }
    process.exit(0);
})();
