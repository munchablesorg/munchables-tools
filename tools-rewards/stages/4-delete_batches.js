import {BlastPointsAPI} from "../../lib/bindings/blast_points.js";
import fs from "node:fs";
import {parse} from "csv-parse";
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    const filename = process.env.REWARDS_TYPE+'-batch-ids.csv';

    const blast_api = new BlastPointsAPI(
        process.env.REWARDS_PREFIX,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE
    );
    await blast_api.obtainBearerToken();
    const batchIds = []
    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    for await (const record of parser) {
        const [id] = record;
        batchIds.push(id);
    }
    await blast_api.deleteBatches(batchIds);
})();


