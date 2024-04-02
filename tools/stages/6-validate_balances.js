/*
Validates that all of the entries in the distribution contract were sent
 */

import {validateFinalBalances} from "../helpers/validate_helper.js";
import {LOCK_COLLATED_FILE, LOCK_COLLATED_TESTNET_FILE} from "../../lib/env.js";

const cacheDir = './cache/';
const balancesLogFilename = `${cacheDir}balances.log.json`;

(async () => {
    console.log(`Running on ${process.env.BLAST_ENV}`);
    let filename = LOCK_COLLATED_FILE;
    if (process.env.BLAST_ENV === 'testnet'){
        filename = LOCK_COLLATED_TESTNET_FILE;
    }
    await validateFinalBalances(filename, balancesLogFilename);
    process.exit(0);
})();
