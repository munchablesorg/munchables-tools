
import dotenv from 'dotenv';
dotenv.config();
import {sleep} from "../lib/sleep.js";
import {BlastPointsAPI} from "../lib/bindings/blast_points.js";



(async () => {

    const blast_api = new BlastPointsAPI(
        process.env.POINTS_PREFIX,
        process.env.POINTS_PRIVATE_KEY,
        process.env.POINTS_CONTRACT,
        process.env.POINTS_OPERATOR,
        'POINTS',
        false
    );
    await blast_api.obtainBearerToken();

    const statuses = await blast_api.getAllBatchStatuses();
    console.log(statuses.map(s => {
        return [s.pointType, s.status, s.createdAt, s.points, s.id].join('\t');
    }).join('\n'));


})();