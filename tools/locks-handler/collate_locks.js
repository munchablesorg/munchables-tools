/*
collates the locks.csv file into locks-collated.csv which can be passed to the
populate script
 */
import fs from 'node:fs';
import { parse } from 'csv-parse';
import {ethers} from "ethers";
import {LOCK_COLLATED_FILE, LOCKS_FILE} from "../../lib/env.js";
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
        .createReadStream(`${__dirname}../../${LOCKS_FILE}`)
        .pipe(parse({
            // CSV options if any
        }));
    for await (const record of parser) {
        const [account, token_contract, symbol, _quantity] = record;
        const quantity = BigInt(_quantity);
        if (!accounts[account]){
            accounts[account] = {
                quantity: 0n,
                token_type: symbol_to_id(symbol)
            }
        }
        accounts[account].quantity += quantity;
    }

    // console.log(accounts);

    const totals = {
        1: 0n,
        2: 0n,
        3: 0n,
    }
    let collated_csv = '';
    const collated_filename = LOCK_COLLATED_FILE;
    for (const account in accounts) {
        const data = accounts[account];
        totals[data.token_type] += data.quantity;
        collated_csv += `${account},${data.quantity.toString()},${data.token_type}\n`;
    }
    fs.writeFileSync(collated_filename, collated_csv)

    console.log(`----------------------------\nORIGINAL\n----------------------------`);
    console.log(`ETH : ${totals[1].toString()} = ${ethers.formatEther(totals[1])}`);
    console.log(`USDB : ${totals[2].toString()} = ${ethers.formatEther(totals[2])}`);
    console.log(`WETH : ${totals[3].toString()} = ${ethers.formatEther(totals[3])}`);



    const totals_collated = {
        1: 0n,
        2: 0n,
        3: 0n,
    }
    const parser_collated = fs
        .createReadStream(collated_filename)
        .pipe(parse({
            // CSV options if any
        }));
    for await (const record_collated of parser_collated) {
        const [account, _quantity, symbol] = record_collated;
        const quantity = BigInt(_quantity);
        totals_collated[symbol] += quantity;
    }

    console.log(`----------------------------\nCOLLATED\n----------------------------`);
    console.log(`ETH : ${totals_collated[1].toString()} = ${ethers.formatEther(totals_collated[1])}`);
    console.log(`USDB : ${totals_collated[2].toString()} = ${ethers.formatEther(totals_collated[2])}`);
    console.log(`WETH : ${totals_collated[3].toString()} = ${ethers.formatEther(totals_collated[3])}`);

    if (totals_collated[1] === totals[1] &&
        totals_collated[2] === totals[2] &&
        totals_collated[3] === totals[3]){
        console.log('\x1b[32m%s\x1b[0m', `COLLATED TOTALS MATCH`);
    }
    else {
        console.log('\x1b[31m%s\x1b[0m', `COLLATED TOTALS DO NOT MATCH`);
    }

    process.exit(0);
})();
