/*
Populates the DISTRIBUTE_CONTRACT with data from the locks-collated.csv file
 */

import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
import { populateDistribute } from "./populate_distribute_helper.js";

(async () => {
    let filename = 'locks-collated.csv';
    if (process.env.BLAST_ENV === 'testnet'){
        filename = 'locks-collated-test.csv';
    }
    await populateDistribute(filename)
    process.exit(0);
})();
