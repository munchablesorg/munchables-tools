/*
Validates that all of the entries in the distribution contract were sent
 */

import {getUndistributed} from "../helpers/validate_helper.js";

(async () => {
    console.log(`Running on ${process.env.BLAST_ENV}`);
    const undistributed = await getUndistributed();
    console.log(undistributed, `${undistributed.length} undistributed`);
    process.exit(0);
})();
