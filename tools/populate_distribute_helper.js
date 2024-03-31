import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
import { parse } from 'csv-parse';
import {distribute_contract, provider} from "../lib/contracts.js";
import {BigNumber} from "ethers";
import cliProgress from "cli-progress";
import {ACCOUNT_COUNT} from "../lib/env.js";
const __dirname = new URL('.', import.meta.url).pathname;

const QUEUE_LENGTH = process.env.QUEUE_LENGTH;
let retries = [];

const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

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
const publish_queue = async (queue, customSigner) => {
    const accounts = [], tokens = [], quantities = [];
    for (let i=0;i<queue.length;i++){
        let account;
        account = queue[i].account;
        accounts.push(account);
        tokens.push(queue[i].symbol);
        quantities.push(BigNumber.from(queue[i].quantity));
    }
    const res = 
      customSigner ?
      await distribute_contract.connect(customSigner).populate(accounts, tokens, quantities) :
      await distribute_contract.populate(accounts, tokens, quantities, {
        gasLimit: 20000000
      });
    await provider.waitForTransaction(res.hash, 3);

    return res.hash;
}

export const populateDistribute = async (filename, customSigner) => {
    console.log(`Populating ${filename} to ${process.env.DISTRIBUTE_CONTRACT} on ${process.env.BLAST_ENV}`);
    progress_bar.start(Math.ceil(ACCOUNT_COUNT / QUEUE_LENGTH), 0); // 3223 = lines in final collated csv

    const parser = fs
        .createReadStream(filename)
        .pipe(parse({
            // CSV options if any
        }));
    let queue = [];
    let published = 0;
    for await (const record of parser) {
        // Work with each record
        const [account, quantity, symbol] = record;
        queue.push({account, symbol, quantity});
        if (queue.length === QUEUE_LENGTH){
            const tx_id = await publish_queue(queue, customSigner);
            progress_bar.update(++published);

            retries[tx_id] = queue;

            queue = [];
        }
    }
    if (queue.length){
        const tx_id = await publish_queue(queue, customSigner);

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

