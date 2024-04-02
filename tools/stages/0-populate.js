/*
Populates the DISTRIBUTE_CONTRACT with data from the locks-collated.csv file
 */

import dotenv from 'dotenv';
dotenv.config();
import { populateDistribute } from "../helpers/populate_helper.js";
import {LOCK_COLLATED_FILE, LOCK_COLLATED_TESTNET_FILE} from "../../lib/env.js";

(async () => {
    let filename = LOCK_COLLATED_FILE;
    if (process.env.BLAST_ENV === 'testnet'){
        filename = LOCK_COLLATED_TESTNET_FILE;
    }
    await populateDistribute(filename)
    process.exit(0);
})();
