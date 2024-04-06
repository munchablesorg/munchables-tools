import {BlastPointsAPI} from "../../lib/bindings/blast_points.js";
import fs from "node:fs";
import {parse} from "csv-parse";
import cliProgress from "cli-progress";
import dotenv from 'dotenv';
dotenv.config();

const prefix = process.env.REWARDS_PREFIX;
const BATCH_SIZE = process.env.REWARDS_BATCH_SIZE || 1000;

(async () => {
    const batch_ids_file = process.env.REWARDS_TYPE+'-batch-ids.csv';
    const distribution_file = process.env.REWARDS_TYPE+'-distribution.csv';

    const blast_api = new BlastPointsAPI(
        prefix,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE
    );
    await blast_api.obtainBearerToken();

    const parserDistribution = fs
        .createReadStream(distribution_file)
        .pipe(parse({}));
    const localAccountMapping = {}
    let length = 0
    for await (const record of parserDistribution) {
        const [account, points] = record;
        localAccountMapping[account.toLowerCase()] = parseFloat(points);
        length++
    }

    let total_batches = 0, pending_batches = [], batches_from_csv = [];

    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    console.log(`Reading CSV`);
    const parserBatchIds = fs
        .createReadStream(batch_ids_file)
        .pipe(parse({}));
    for await (const record of parserBatchIds) {
        batches_from_csv.push(record);
    }

    progress_bar.start(batches_from_csv.length, 0);
    const externalAccountMapping = {}
    for (let i = 0; i < batches_from_csv.length; i++) {
        const record = batches_from_csv[i];
        total_batches++;
        const [id] = record;
        const returnData = await blast_api.getBatchStatus(id);
        if (returnData.status !== 'FINALIZED') {
            pending_batches.push(id);
        }
        for (let i of returnData.transfers) {
            externalAccountMapping[i.toAddress.toLowerCase()] = parseFloat(i.points);
        }
        progress_bar.increment();
    }
    progress_bar.stop();
    
    for (let account in localAccountMapping) {
        const lower_bound = externalAccountMapping[account] * 0.999;
        const upper_bound = externalAccountMapping[account] * 1.001;
        if (localAccountMapping[account] < lower_bound || localAccountMapping[account] > upper_bound) {
            console.error(`Account ${account} has a discrepancy in points: ${localAccountMapping[account]} != ${externalAccountMapping[account]}`);
            process.exit(1);
        }
    }

    // Have to do reverse case too in case there were accounts blatantly missing
    for (let account in externalAccountMapping) {
        const lower_bound = localAccountMapping[account] * 0.999;
        const upper_bound = localAccountMapping[account] * 1.001;
        if (externalAccountMapping[account] < lower_bound || externalAccountMapping[account] > upper_bound) {
            console.error(`Account ${account} has a discrepancy in points: ${localAccountMapping[account]} != ${externalAccountMapping[account]}`);
            process.exit(1);
        }
    }
    console.log('All accounts and points match');
    if (pending_batches.length){
        console.log(`${pending_batches.length}/${total_batches} batches still pending`);
    }
    else {
        console.log('All batches have been finalised');
    }
})();




