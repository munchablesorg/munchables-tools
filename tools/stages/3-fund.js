import {approveAndFund} from "../helpers/fund_helper.js";
import {provider} from "../../lib/contracts.js";
import {ethers} from "ethers";
(async () => {
    // NOTE: This stage is only to be run if using local clone of mainnet
    // This stage should be run via the multisig in practice
    await provider.send('hardhat_impersonateAccount', [process.env.MSIG]);
    let currentBalance = await provider.getBalance(process.env.MSIG);
    currentBalance = BigInt(currentBalance.toString());
    const increaseAmount = BigInt(1e17); 
    const newBalance = currentBalance + increaseAmount;
    // Update the balance
    await provider.send('hardhat_setBalance', [process.env.MSIG, `0x${newBalance.toString(16)}`]);
    const msigOwner = await provider.getSigner(process.env.MSIG);
    await approveAndFund(process.env.DISTRIBUTE_CONTRACT_OWNER, msigOwner);
})();
