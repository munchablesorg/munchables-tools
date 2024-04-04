import {distributeAll} from "../helpers/distribute_helper.js";
import {provider} from "../../lib/contracts.js";
import {approveAndFund} from "../helpers/fund_helper.js";
import {ethers} from "ethers";
(async () => {
    console.log(`Distributing funds`);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const distributor = wallet.connect(provider);
    await distributeAll(distributor);
})();
