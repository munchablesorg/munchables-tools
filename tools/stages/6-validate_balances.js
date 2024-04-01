/*
Validates that all of the entries in the distribution contract were sent
 */

import {validateFinalBalances} from "../helpers/validate_helper.js";

const cacheDir = './cache/';
const balancesLogFilename = `${cacheDir}balances.log.json`;

(async () => {
    console.log(`Running on ${process.env.BLAST_ENV}`);
    let filename = 'locks-collated.csv';
    if (process.env.BLAST_ENV === 'testnet'){
        filename = 'locks-collated-test.csv';
    }
    await validateFinalBalances(filename, balancesLogFilename);
    process.exit(0);
})();
