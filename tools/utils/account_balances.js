import {provider, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {ethers} from "ethers";


(async () => {
    const account = process.argv[2];

    const eth_balance = await provider.getBalance(account);
    const usdb_balance = await usdb_contract.balanceOf(account);
    const weth_balance = await weth_contract.balanceOf(account);

    console.log(`Account : ${account}`);
    console.log(`ETH : ${eth_balance} ${ethers.formatEther(eth_balance)}`);
    console.log(`USDB : ${usdb_balance} ${ethers.formatEther(usdb_balance)}`);
    console.log(`WETH : ${weth_balance} ${ethers.formatEther(weth_balance)}`);
})();
