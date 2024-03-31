/*
collates the locks.csv file into locks-collated.csv which can be passed to the
populate script
 */
import fs from 'node:fs';
import { parse } from 'csv-parse';
import {BigNumber, ethers} from "ethers";
const __dirname = new URL('.', import.meta.url).pathname;

const symbol_to_id = (sym) => {
    switch (sym){
        case 'ETH':
            return 1;
        case 'USDB':
            return 2;
        case 'WETH':
            return 3;
        default:
            return 0;
    }
}

(async () => {
    const accounts = {};
    const parser = fs
        .createReadStream(`${__dirname}/../locks.csv`)
        .pipe(parse({
            // CSV options if any
        }));
    for await (const record of parser) {
        const [account, token_contract, symbol, _quantity] = record;
        const quantity = BigNumber.from(_quantity);
        if (!accounts[account]){
            accounts[account] = {
                quantity: BigNumber.from(0),
                token_type: symbol_to_id(symbol)
            }
        }
        accounts[account].quantity = accounts[account].quantity.add(quantity);
    }

    // console.log(accounts);

    const totals = {
        1: BigNumber.from(0),
        2: BigNumber.from(0),
        3: BigNumber.from(0),
    }
    let collated_csv = '';
    const collated_filename = 'locks-collated.csv';
    for (const account in accounts) {
        const data = accounts[account];
        totals[data.token_type] = totals[data.token_type].add(data.quantity);
        collated_csv += `${account},${data.quantity.toString()},${data.token_type}\n`;
    }
    fs.writeFileSync(collated_filename, collated_csv)

    console.log(`----------------------------\nORIGINAL\n----------------------------`);
    console.log(`ETH : ${totals[1].toString()} = ${ethers.utils.formatEther(totals[1])}`);
    console.log(`USDB : ${totals[2].toString()} = ${ethers.utils.formatEther(totals[2])}`);
    console.log(`WETH : ${totals[3].toString()} = ${ethers.utils.formatEther(totals[3])}`);



    const totals_collated = {
        1: BigNumber.from(0),
        2: BigNumber.from(0),
        3: BigNumber.from(0),
    }
    const parser_collated = fs
        .createReadStream(collated_filename)
        .pipe(parse({
            // CSV options if any
        }));
    for await (const record_collated of parser_collated) {
        const [account, _quantity, symbol] = record_collated;
        const quantity = BigNumber.from(_quantity);
        totals_collated[symbol] = totals_collated[symbol].add(quantity);
    }

    console.log(`----------------------------\nCOLLATED\n----------------------------`);
    console.log(`ETH : ${totals_collated[1].toString()} = ${ethers.utils.formatEther(totals_collated[1])}`);
    console.log(`USDB : ${totals_collated[2].toString()} = ${ethers.utils.formatEther(totals_collated[2])}`);
    console.log(`WETH : ${totals_collated[3].toString()} = ${ethers.utils.formatEther(totals_collated[3])}`);

    process.exit(0);
})();
