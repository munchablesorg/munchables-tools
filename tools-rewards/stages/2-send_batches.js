import {BlastPointsAPI, BlastPointsTransfer } from "../../lib/bindings/blast_points.js";
import fs from "node:fs";
import {parse} from "csv-parse";
import dotenv from 'dotenv';
dotenv.config();

const prefix = process.env.REWARDS_PREFIX;
const BATCH_SIZE = process.env.REWARDS_BATCH_SIZE || 1000;

(async () => {
    const type = process.env.REWARDS_TYPE === 'POINTS' ? 'LIQUIDITY' : 'DEVELOPER';
    const filename = process.env.REWARDS_TYPE+'-distribution.csv';

    const blast_api = new BlastPointsAPI(
        prefix,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE
    );
    await blast_api.obtainBearerToken();
    const balance = await blast_api.getContractPointsBalance();
    let multiplier = process.env.REWARDS_ENV === 'testnet' ? 0.1 : 1;
    let available_num = parseFloat(balance[type].available) * multiplier;

    let batch = [], batch_calls = [], points_total = 0;
    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    for await (const record of parser) {
        const [account, points] = record;
        batch.push({account, points});
        points_total += parseFloat(points);

        if (batch.length === BATCH_SIZE) {
            batch_calls.push(batch.map(t => {
                return new BlastPointsTransfer(t.account, t.points)
            }))
            batch = [];
        }
    }

    let lower_bound = points_total * 0.99;
    let upper_bound = points_total * 1.01;
    if (available_num < lower_bound || available_num > upper_bound) {
      throw new Error(`Total points to distribute (${points_total}) is not equal to available points (${available_num})`);
    }
    
    let batch_ids = []
    for (let i = 0; i < batch_calls.length; i++) {
        const batch_data = batch_calls[i];  
        const id = await blast_api.submitBatch(batch_data);
        console.log(`Submitted batch ${id}`)
        batch_ids.push(id);
    }

    const outfile = process.env.REWARDS_TYPE+'-batch-ids.csv';
    fs.writeFile(outfile, batch_ids.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

})();

