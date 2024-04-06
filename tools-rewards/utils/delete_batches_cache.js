import {BlastPointsAPI} from "../../lib/bindings/blast_points.js";
import dotenv from 'dotenv';
dotenv.config();

const prefix = process.env.REWARDS_PREFIX;

(async () => {

    const blast_api = new BlastPointsAPI(
        prefix,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE,
        false,
        true
    );
    await blast_api.obtainBearerToken();
    await blast_api.deleteBatches();
})();




