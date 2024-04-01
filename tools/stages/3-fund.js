import {approveAndFund} from "../helpers/fund_helper.js";
import {provider} from "../../lib/contracts.js";

(async () => {
    // NOTE: This stage is only to be run if using local clone of mainnet
    // This stage should be run via the multisig in practice
    const msigOwner = await provider.getSigner(process.env.MSIG);
    await approveAndFund(process.env.DISTRIBUTE_CONTRACT_OWNER, msigOwner);
})();
