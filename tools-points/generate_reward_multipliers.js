import {LOCKS_FILE} from "../lib/env.js";
import fs from "fs";
import {parse} from "csv-parse";
import {provider} from "../lib/contracts.js";
import cliProgress from "cli-progress";
import { FixedPoint } from '@hastom/fixed-point'

(async () => {
    const END_TIME = 1711491600;
    const TIME_EXPONENT = 2;
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(5286, 0); // 5286 = lines in original csv

    const processed_locks = [];
    let quantity_total = {eth: 0n, usdb: 0n, weth: 0n};
    let time_exp_total = {eth: 0n, usdb: 0n, weth: 0n};
    const ten_bil = 10n ** 9n;

    /*
    Read data from original locks.csv file, calculate time exponential and calculate totals
     */
    const parser = fs
        .createReadStream(LOCKS_FILE)
        .pipe(parse({}));
    for await (const record of parser) {
        const [account, token_contract, symbol, quantity, , tx_hash] = record;
        const tx_receipt = await provider.getTransactionReceipt(tx_hash);
        const block = await provider.getBlock(tx_receipt.blockNumber);
        const lock_time = END_TIME - block.timestamp;
        const time_exp = Math.pow(lock_time, TIME_EXPONENT);
        processed_locks.push({account, token_contract, symbol, quantity, lock_time, time_exp});

        const sym = symbol.toLowerCase();
        quantity_total[sym] += BigInt(quantity);
        time_exp_total[sym] += BigInt(time_exp);

        progress_bar.increment();

        if (processed_locks.length === 10){
            break;
        }
    }
    progress_bar.stop();

    console.log(`Found ${processed_locks.length} locks`);


    /*
    Adjust all quantities based on time locked and recalculate total time weighted quantity
     */
    let multiplier_total = {
        eth: new FixedPoint(0n, 18),
        usdb: new FixedPoint(0n, 18),
        weth: new FixedPoint(0n, 18)
    };
    let time_adjusted_qty_total = {
        eth: new FixedPoint(0n, 18),
        usdb: new FixedPoint(0n, 18),
        weth: new FixedPoint(0n, 18)
    };
    for (let i = 0; i < processed_locks.length; i++) {
        const sym = processed_locks[i].symbol.toLowerCase();
        const quantity_fp = new FixedPoint(BigInt(processed_locks[i].quantity), 18);

        const time_exp_fp = new FixedPoint(BigInt(processed_locks[i].time_exp), 18);
        const time_total_fp = new FixedPoint(time_exp_total[sym], 18);
        let multiplier_time = time_exp_fp;
        multiplier_time.div(time_total_fp).add(new FixedPoint(1n * (10n ** 18n), 18));

        processed_locks[i].time_adjusted_qty = quantity_fp.mul(multiplier_time);
        time_adjusted_qty_total[sym].add(processed_locks[i].time_adjusted_qty);
    }


    /*
    Calculate multiplier as time weighted quantity / total twq, calculate total multiplier for validation
     */
    for (let i = 0; i < processed_locks.length; i++){
        const sym = processed_locks[i].symbol.toLowerCase();

        const multiplier = processed_locks[i].time_adjusted_qty;
        multiplier.div(time_adjusted_qty_total[sym]);

        processed_locks[i].multiplier = multiplier;
        multiplier_total[sym].add(multiplier);
    }

    console.log(`Total multipliers\n-----------------\nETH: ${multiplier_total.eth.toDecimalString()}`);
    console.log(`USDB: ${multiplier_total.usdb.toDecimalString()}`);
    console.log(`WETH: ${multiplier_total.weth.toDecimalString()}`);

    /*
    Prepare to write out csv
     */
    const account_totals = {};
    processed_locks.forEach(m => {
        if (!account_totals[m.account]){
            account_totals[m.account] = {
                account: m.account,
                symbol: m.symbol,
                multiplier: m.multiplier
            };
        }
        else {
            account_totals[m.account].multiplier.add(m.multiplier);
        }
    });

    const csv_rows = Object.values(account_totals).map(t =>
        `${t.account},${t.symbol},${t.multiplier.toDecimalString()}`
    );

    const csv_file = 'reward-distribution.csv';
    fs.writeFile(csv_file, csv_rows.join(`\n`), () => {
        console.log(`Wrote ${csv_file}`);
        process.exit(0);
    });

})();