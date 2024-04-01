import dotenv from 'dotenv';
dotenv.config();
if (process.env.NODE_URL_REAL && (process.env.NODE_URL !== process.env.NODE_URL_REAL)){
    process.env.NODE_URL = process.env.NODE_URL_REAL;
}
import {lock_contract, provider} from "../../lib/contracts.js";
import {ethers} from "ethers";
import {sleep} from "../../lib/sleep.js";
import fs from 'fs';
import {get_catchup_block, get_end_block} from "../../lib/commandargs.js";
import {Lock} from '../../lib/lock.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {END_BLOCK, START_BLOCK} from "../../lib/env.js";

const eth_address = '0x0000000000000000000000000000000000000000';
const usdb_address = "0x4300000000000000000000000000000000000003";
const weth_address = "0x4200000000000000000000000000000000000004";

export const lock_abi = [
    `function lock(address _token_contract, uint256 _quantity, uint256 _lock_duration)`,
    `event Locked(address indexed _account, address indexed _token_contract, uint256 _quantity, uint256 _lock_duration, uint256 _unlock_time, uint256 _lock_remainder, uint256 _nft_drop_cost, uint256 _nft_drop)`,
];
const folder_name = 'locks';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Process transfers from an incoming block containing full transfers */
const process_transfers = async (transactions) => {
    const iface = new ethers.Interface(lock_abi);
    const locks = [];

    for (let t = 0; t < transactions.length; t++){
        const tx = transactions[t];
        const tx_hash = tx.hash;
        if (tx.to === process.env.LOCK_CONTRACT){
            try {
                // only successful transactions
                const receipt = await provider.getTransactionReceipt(tx_hash);
                if (receipt.status !== 1){
                    console.log(`Transaction failed : ${tx_hash}`);
                    continue;
                }

                // parse data from tx
                const data = iface.parseTransaction({ data: tx.data, value: tx.value });
                // console.log(data.args, tx.from);
                const lock = new Lock(data.args, tx_hash, tx.from);
                if (lock.token_contract === eth_address){
                    // eth transfer
                    if (data.value !== lock.quantity){
                        console.error(`Value mismatch on transaction ${tx_hash}`, lock.quantity, data.value, data);
                        process.exit(1);
                    }
                }

                locks.push(lock);
            }
            catch (e){
                console.error(`Failed to parse tx data`, tx.hash, e.message);
            }
        }
    }

    return locks;
}



// main code
(async () => {
    let start_block = get_catchup_block(); // from command line as -s <block_number>
    if (!start_block){
        start_block = START_BLOCK; // first lock
    }
    let end_block = get_end_block(); // from command line as -e <block_number>
    if (!end_block){
        end_block = END_BLOCK;
    }
    console.log(`Running from ${start_block} to ${end_block} on RPC ${process.env.NODE_URL}`);

    // make logs dir
    const log_dir = `${__dirname}/../${folder_name}`;
    try {
        if (!fs.existsSync(log_dir)) {
            fs.mkdirSync(log_dir);
        }
    }
    catch (e) {
        console.error(`Cannot create directory for logs ${e.message}`);
    }

    const iface = new ethers.Interface(lock_abi);

    //////////////////////////////////////
    // loop every block and get the transactions
    //////////////////////////////////////
    for (let block_number = start_block; block_number < end_block; block_number++){
        try {

            if (block_number % 100 === 0 || block_number === start_block){
                console.log(`Block ${block_number} => ${end_block}`);
            }

            //////////////////////////////////////
            // Get the data with all transactions for this block
            //////////////////////////////////////
            let block, new_locks = [];
            try {
                block = await provider.getBlock(block_number, true);
            }
            catch (e){
                console.error(`Error fetching block ${block_number} with tx`, e.message);
                process.exit(1);
            }

            //////////////////////////////////////
            // fetch data from those blocks for our lock transactions
            //////////////////////////////////////
            new_locks = await process_transfers(block.prefetchedTransactions);

            //////////////////////////////////////
            // get events to match, for inline and belt and braces
            //////////////////////////////////////
            const locked_events = await lock_contract.queryFilter(
                lock_contract.filters.Locked(),
                block_number,
                block_number,
            );
            if (locked_events.length){
                for (let i = 0; i < locked_events.length; i++){
                    const evt = locked_events[i];
                    const found_lock = new_locks.find(l => l.tx_hash === evt.transactionHash);
                    if (!found_lock){
                        try {
                            console.log(`Could not find evt in block response`, evt.transactionHash);

                            const data = iface.parseLog(evt);
                            const lock = new Lock(data.args, evt.transactionHash, data.args._account);
                            new_locks.push(lock);
                        }
                        catch (e){
                            console.error(`Could not parse tx from event ${e.message}`);
                            process.exit(1);
                        }
                    }
                }
            }


            //////////////////////////////////////
            // write out log file with raw (json encoded lock data)
            //////////////////////////////////////
            if (new_locks.length){
                const locks_json = JSON.stringify(new_locks, (key, value) =>
                    typeof value === 'bigint'
                        ? value.toString()
                        : value
                );
                if (locks_json === ''){
                    console.error(`Invalid JSON`, new_locks);
                    process.exit(1);
                }
                const log_filename = `${folder_name}/locks-${block_number}.json`;
                fs.writeFileSync(log_filename, locks_json);
                console.log(`Wrote ${log_filename}`);
            }
        }
        catch (e){
            console.error(`Error in block loop, trying again... ${e.message}`);
            await sleep(1000);
            block_number--;
        }
    }

    process.exit(0);
})();
