
import dotenv from 'dotenv';
dotenv.config();

import {sleep} from "../../lib/sleep.js";
import cliProgress from 'cli-progress';
import {ACCOUNT_COUNT} from "../../lib/env.js";
import {ethers} from 'ethers';
import { distribute_abi } from "../../lib/abis.js";
import {provider} from "../../lib/contracts.js";
import fs from 'fs'

const contractAddresses = [
  "0xf5d4902eCF3427eC49dfF60A621c12eEcb6011c2",
  "0xFd7668EB00b52C987Cc2cAdb44991C0202472a10",
  "0xCF9C71569f422A3Cd1660edf23798807D12C1E85",
  "0x5DB807FDdA723779B393F5B048AAd444cE0aBACf",
  "0xA9996114e2a27d26f5c6CB86d29Ea0E3bc46C4F6",
  "0xdf3E6c06DE8E677Bc76e39e744CB4C9820fF514e",
  "0x4a713FA099Eff7119968a1e13F4e792285760378",
  "0xFb3C40118aee20B4240512938996729D9CcCFa80",
  "0xEF402107311d4670524457d285a37F0108Cf2761",
  "0xe141A09Fd28f9c2a3695f6162ec7fbcB756CB19c",
  "0x5639C28a8f1c60c68c9Bf35A7f5fe45A7B8D586A"
];

async function retry(fn, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`Attempt ${i + 1}: Retrying...`);
            if (i === retries - 1) throw error;
            await sleep(delay);
        }
    }
}

export const getAccountData = async (contractAddress) => {
    let start = 0;
    let complete = 0;
    const page_size = 50;
    let all_accounts = [];
    const null_addr = '0x0000000000000000000000000000000000000000';

    const currentDistributeContract = new ethers.Contract(
        contractAddress,
        distribute_abi,
        provider
    );

    console.log(`Syncing accounts from contract ${contractAddress}`);
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(Math.ceil(ACCOUNT_COUNT / page_size), 0); // 3223 = lines in final collated csv

    while (true){
        // console.log(`Reading from ${start}`)
        let new_accounts = await retry(() => currentDistributeContract.getAccountList(start));
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

    console.log(`Collected ${all_accounts.length} accounts from chain, retrieving state data.`);

    const undistributed = [];
    progress_bar.start(all_accounts.length, 0);
    for (let i = 0; i < all_accounts.length; i++){
        const account = all_accounts[i];
        let distribution_data = await retry(() => currentDistributeContract.getDistributeData(account));
        progress_bar.increment();
        let new_data = [account, distribution_data[1].toString(), distribution_data[0].toString()]
        undistributed.push(new_data);
        await sleep(50);
    }
    progress_bar.stop();

    return undistributed;
}

const main = async () => {
    let data = []
    for (let contractAddress of contractAddresses){
        const undistributed = await getAccountData(contractAddress);
        console.log(`Contract ${contractAddress} has ${undistributed.length} undistributed accounts`);
        data = [...data, ...undistributed]
    }
    const collated_filename = 'onstate_data.csv';
    let collated_csv = ''
    for (const row in data) {
        const current_row = data[row];
        collated_csv += `${current_row[0]},${current_row[1]},${current_row[2]}\n`;
    }
    fs.writeFileSync(collated_filename, collated_csv)
}

main().then(() => console.log('Data collection complete'));

