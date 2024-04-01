import {getInitialBalances} from "../helpers/validate_helper.js";

(async () => {
    let filename = 'locks-collated.csv';
    if (process.env.BLAST_ENV === 'testnet'){
        filename = 'locks-collated-test.csv';
    }
    try {
        await getInitialBalances(filename);
    }
    catch (e){
        console.error(`Failure during getInitialBalances ${e.message}`);
        throw e;
    }
})();