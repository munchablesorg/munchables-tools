import dotenv from 'dotenv';
dotenv.config();
import {BlastPointsAPI} from "../../lib/bindings/blast_points.js";

(async () => {

    const blast_api = new BlastPointsAPI(
        process.env.REWARDS_PREFIX,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE,
        false
    );
    await blast_api.obtainBearerToken();

    const points = await blast_api.getContractPointsBalance();
    console.log(points)
})();
