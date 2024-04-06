
import dotenv from 'dotenv';
dotenv.config();
import {BlastPointsAPI} from "../../lib/bindings/blast_points.js";
import fs from 'fs';


(async () => {

    const blast_api = new BlastPointsAPI(
        process.env.REWARDS_PREFIX,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE
    );
    await blast_api.obtainBearerToken();

    const statuses = await blast_api.getAllBatchStatuses();
    const csv_file = process.env.REWARDS_TYPE+'-distribution.csv';
    
    let points_distro_rows = ''
    for (let s of statuses) {
      try {
          const data = await blast_api.getBatchStatus(s.id);
          for (let i of data.transfers) {
            points_distro_rows += `${data.id},${i.toAddress},${i.points}\n`;
          }
        } catch (e) {
          console.error(e);
          process.exit(1)
        }
    }

    fs.writeFile(csv_file, points_distro_rows, () => {
        console.log(`Wrote ${csv_file}`);
        process.exit(0);
    });
})();
