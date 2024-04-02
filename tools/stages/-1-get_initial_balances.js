import {getInitialBalances} from "../helpers/validate_helper.js";
import {LOCK_COLLATED_FILE, LOCK_COLLATED_TESTNET_FILE} from "../../lib/env.js";

(async () => {
    let filename = LOCK_COLLATED_FILE;
    if (process.env.BLAST_ENV === 'testnet'){
        filename = LOCK_COLLATED_TESTNET_FILE;
    }
    try {
        await getInitialBalances(filename);
    }
    catch (e){
        console.error(`Failure during getInitialBalances ${e.message}`);
        throw e;
    }
})();