import {BlastPointsAPI, BlastPointsTransfer } from "../../lib/bindings/blast_points.js";
import fs from "node:fs";
import {parse} from "csv-parse";
import dotenv from 'dotenv';
import cliProgress from "cli-progress";
dotenv.config();

const prefix = process.env.REWARDS_PREFIX;
const BATCH_SIZE = parseInt(process.env.REWARDS_BATCH_SIZE) || 1000;

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
    if (batch.length){
        batch_calls.push(batch.map(t => {
            return new BlastPointsTransfer(t.account, t.points)
        }))
    }

    let lower_bound = points_total * 0.99;
    let upper_bound = points_total;
    if (available_num < lower_bound) {
        throw new Error(`Total points to distribute (${points_total}) is not equal to available points (${available_num})`);
    }
    else if (upper_bound > available_num) {
        throw new Error(`Total points to distribute (${points_total}) is greater than available points (${available_num})`);
    }
    
    let batch_ids = []
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(batch_calls.length, 0);
    for (let i = 0; i < batch_calls.length; i++) {
        const batch_data = batch_calls[i];
        try {
            const id = await blast_api.submitBatch(batch_data);
            batch_ids.push(id);
        }
        catch (e){
            const code_re = new RegExp(/status code ([0-9]{3})/, 'i');
            const m = e.message.match(code_re);
            const status_code = m[1];
            if (m && status_code && status_code === '409'){
                // duplicate batch, continue below to increment bar
            }
            else {
                console.error(`Error submitting batch ${e.message}, rolling back`);
                await blast_api.deleteBatches();
                progress_bar.stop();
                throw e;
            }
        }

        progress_bar.increment();
    }
    progress_bar.stop();

    const outfile = process.env.REWARDS_TYPE+'-batch-ids.csv';
    fs.writeFile(outfile, batch_ids.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

})();

