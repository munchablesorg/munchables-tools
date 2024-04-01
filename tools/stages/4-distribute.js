import {distributeAll} from "../helpers/distribute_helper.js";
import {provider} from "../../lib/contracts.js";
import {approveAndFund} from "../helpers/fund_helper.js";

(async () => {
    console.log(`Distributing funds`);
    const distributor = await provider.getSigner(process.env.DISTRIBUTE_CONTRACT_OWNER);
    await distributeAll(distributor);
})();