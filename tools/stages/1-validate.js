/*
Validates that the locks-collated.csv file data and the chain data match exactly
 */

import { get_csv_hash, get_chain_hash } from '../helpers/validate_helper.js';
import {LOCK_COLLATED_FILE, LOCK_COLLATED_TESTNET_FILE} from "../../lib/env.js";

(async () => {
    console.log(`Running on ${process.env.BLAST_ENV}`);
    let filename = LOCK_COLLATED_FILE;
    if (process.env.BLAST_ENV === 'testnet'){
        filename = LOCK_COLLATED_TESTNET_FILE;
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
