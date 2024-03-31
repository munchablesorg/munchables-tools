import dotenv from 'dotenv';
dotenv.config();
import {distribute_contract} from "../../lib/contracts.js";
import {ethers} from "ethers";

const print_totals = (totals) => {
    console.log(`ETH : ${totals[0]} ${ethers.utils.formatEther(totals[0])}`);
    console.log(`USDB : ${totals[1]} ${ethers.utils.formatEther(totals[1])}`);
    console.log(`WETH : ${totals[2]} ${ethers.utils.formatEther(totals[2])}`);
}

(async () => {
    console.log(`Stats for ${process.env.DISTRIBUTE_CONTRACT} on ${process.env.BLAST_ENV}`);

    const owner = await distribute_contract.owner();
    console.log(`Owner :\t\t${owner}`);

    const distribute_totals = await distribute_contract.distribute_totals({gasLimit: 100000});
    console.log(`-----------------\nTargets\n-----------------`);
    print_totals(distribute_totals);

    const populate_totals = await distribute_contract.populate_totals();
    console.log(`-----------------\nPopulated\n-----------------`);
    print_totals(populate_totals);

    const sent_totals = await distribute_contract.sent_totals();
    console.log(`-----------------\nSent\n-----------------`);
    print_totals(sent_totals);

    process.exit(0);
})();
