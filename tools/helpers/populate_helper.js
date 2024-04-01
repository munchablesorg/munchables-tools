import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
import { parse } from 'csv-parse';
import {distribute_contract, provider} from "../../lib/contracts.js";
import cliProgress from "cli-progress";
import {ACCOUNT_COUNT} from "../../lib/env.js";
import {sleep} from "../../lib/sleep.js";
const __dirname = new URL('.', import.meta.url).pathname;

const QUEUE_LENGTH = process.env.QUEUE_LENGTH;
let retries = [];

const progress_bar = new cliProgress.SingleBar({linewrap: false}, cliProgress.Presets.shades_classic);

const symbol_to_id = (sym) => {
    switch (sym){
        case 'ETH':
            return 1;
        case 'USDB':
            return 2;
        case 'WETH':
            return 3;
        default:
            return 0;
    }
}
const publish_queue = async (queue, customSigner = null) => {
    const accounts = [], tokens = [], quantities = [];
    for (let i=0;i<queue.length;i++){
        let account;
        account = queue[i].account;
        accounts.push(account);
        tokens.push(queue[i].token_type);
        quantities.push(queue[i].quantity);
    }
    // console.log(accounts, tokens, quantities)
    let res;
    if (customSigner){
        res = await distribute_contract.connect(customSigner).populate(accounts, tokens, quantities);
    }
    else {
        res = await distribute_contract.populate(accounts, tokens, quantities, {
                    gasLimit: 20000000
                });
    }
    // on clone network waitForTransaction hangs
    if (process.env.BLAST_ENV === 'clone'){
        await sleep(3000);
    }
    else {
        await provider.waitForTransaction(res.hash, 3);
    }
    // console.log('confirmed in block');

    return res.hash;
}

export const populateDistribute = async (filename, customSigner) => {
    console.log(`Populating ${filename} to ${process.env.DISTRIBUTE_CONTRACT} on ${process.env.BLAST_ENV} with queue length ${process.env.QUEUE_LENGTH}`);
    progress_bar.start(Math.ceil(ACCOUNT_COUNT / QUEUE_LENGTH), 0); // 3223 = lines in final collated csv

    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    let queue = [];
    let published = 0;
    for await (const record of parser) {
        // Work with each record
        const [account, quantity, token_type] = record;
        queue.push({account, token_type, quantity});

        if (queue.length >= QUEUE_LENGTH){
            try {
                const tx_id = await publish_queue(queue, customSigner);
                progress_bar.update(++published);

                retries[tx_id] = queue;

                queue = [];
            }
            catch (e){
                progress_bar.stop()
                console.error(`Error publishing - ${e.message}`)
                process.exit(1)
            }
        }
    }
    if (queue.length){
        const tx_id = await publish_queue(queue, customSigner);
        progress_bar.update(++published);

        retries[tx_id] = queue;
    }
    progress_bar.stop();


    console.log('COMPLETED... Waiting for status confirmation and retries...');

    const tx_hashes = Object.keys(retries);
    for (let i = 0; i < tx_hashes.length; i++){
        const receipt = await provider.getTransactionReceipt(tx_hashes[i]);
        if (receipt.status === 1){
            console.log(`${tx_hashes[i]} - success`);
        }
        else {
            console.log(`${tx_hashes[i]} - failed ${receipt.status}`);
        }
    }

}

