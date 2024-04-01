import {approveAndFund} from "../helpers/fund_helper.js";
import {provider} from "../../lib/contracts.js";

(async () => {
    const msigOwner = await provider.getSigner(process.env.MSIG);
    await approveAndFund(process.env.DISTRIBUTE_CONTRACT_OWNER, msigOwner);
})();
