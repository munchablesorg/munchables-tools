/*
Validates that the locks-collated.csv file data and the chain data match exactly
 */

import dotenv from 'dotenv';
dotenv.config();

import {distribute_contract} from "../../lib/contracts.js";
import {sleep} from "../../lib/sleep.js";
import cliProgress from 'cli-progress';
import {ACCOUNT_COUNT} from "../../lib/env.js";

const get_undistributed = async () => {
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

(async () => {
    console.log(`Running on ${process.env.BLAST_ENV}`);
    const undistributed = await get_undistributed();
    console.log(undistributed, `${undistributed.length} undistributed`);
    process.exit(0);
})();
