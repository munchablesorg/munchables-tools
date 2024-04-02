/*
Populates the DISTRIBUTE_CONTRACT with data from the locks-collated.csv file
 */

import dotenv from 'dotenv';
dotenv.config();
import { populateDistribute } from "../helpers/populate_helper.js";
import {ACCOUNT_COUNT, LOCK_COLLATED_FILE, LOCK_COLLATED_TESTNET_FILE} from "../../lib/env.js";
import fs from "fs";
import {parse} from "csv-parse";
import {provider} from "../../lib/contracts.js";
import cliProgress from "cli-progress";
const progress_bar = new cliProgress.SingleBar({linewrap: false}, cliProgress.Presets.shades_classic);

(async () => {
    let checked = 0;
    progress_bar.start(ACCOUNT_COUNT, 0); // 3223 = lines in final collated csv

    const contract_accounts = [];
    let filename = LOCK_COLLATED_FILE;
    if (process.env.BLAST_ENV === 'testnet'){
        filename = LOCK_COLLATED_TESTNET_FILE;
    }

    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    let queue = [];
    let published = 0;
    for await (const record of parser) {
        const [account] = record;
        // console.log(account);
        const code = await provider.getCode(account);
        if (code !== '0x'){
            // console.log(record.join(','));
            contract_accounts.push(record);
        }
        progress_bar.update(++checked);
    }
    progress_bar.stop();

    if (contract_accounts.length){
        console.log(contract_accounts.map(r => r.join(',')).join(`\n`));
    }
    else {
        console.log('No contracts found');
    }
    process.exit(0);
})();
