import {LOCKS_FILE} from "../../lib/env.js";
import fs from "fs";
import {parse} from "csv-parse";
import {provider} from "../../lib/contracts.js";
import cliProgress from "cli-progress";
import { FixedPoint } from '@hastom/fixed-point'
import dotenv from 'dotenv';
dotenv.config();

const JUICE_GOLD_ORIGINAL_ADDRESS = '0x01f7df622dde3b7d234aadbe282dda24cead9d21'.toLowerCase();
const JUICE_GOLD_REPLACEMENT_ADDRESS = '0x34C9F9353566Fd33682DBd77054d2287BFf7cA7D';

(async () => {
    const env = process.env.REWARDS_TYPE;
    if (!['POINTS', 'GOLD', 'YIELD'].includes(env)) {
      throw new Error('REWARDS_TYPE must be set to POINTS, GOLD or YIELD')
    }

    const END_TIME = 1711491600;
    const TIME_EXPONENT = 1.1;
    const LOCK_INTENT_EXPONENT = 1.15
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(5286, 0); // 5286 = lines in original csv

    const processed_locks = [];
    let quantity_total = {eth: 0n, usdb: 0n, weth: 0n};
    let time_exp_total = {eth: 0n, usdb: 0n, weth: 0n};
    let lock_intent_exp_total = {eth: 0n, usdb: 0n, weth: 0n};
    const thirty_days = 60 * 60 * 24 * 30;

    /*
    Read data from original locks.csv file, calculate time exponential and calculate totals
     */
    const parser = fs
        .createReadStream(LOCKS_FILE)
        .pipe(parse({}));
    for await (const record of parser) {
        let [account, token_contract, symbol, quantity, lock_duration, tx_hash, block_timestamp] = record;
        const lock_time = END_TIME - parseInt(block_timestamp);
        lock_duration = parseInt(lock_duration);
        const time_exp = Math.floor(Math.pow(lock_time, TIME_EXPONENT));
        // console.log(lock_duration - thirty_days);
        const lock_dur_exp = Math.floor(Math.pow(lock_duration, LOCK_INTENT_EXPONENT));
        processed_locks.push({account, token_contract, symbol, quantity, lock_time, time_exp, lock_dur_exp});

        const sym = symbol.toLowerCase();
        quantity_total[sym] += BigInt(quantity);
        time_exp_total[sym] += BigInt(time_exp);
        lock_intent_exp_total[sym] += BigInt(lock_dur_exp);

        progress_bar.increment();

        // if (processed_locks.length === 10){
        //     break;
        // }
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
        multiplier_time.div(time_total_fp)

        const lock_intent_fp = new FixedPoint(BigInt(processed_locks[i].lock_dur_exp), 18);
        const lock_intent_total_fp = new FixedPoint(lock_intent_exp_total[sym], 18);
        let multiplier_intent = lock_intent_fp;
        multiplier_intent.div(lock_intent_total_fp)

        let multiplier = new FixedPoint(1n * (10n ** 18n), 18);
        if (env === 'GOLD') {
          multiplier = multiplier.add(multiplier_time).add(multiplier_intent);
        } {
          multiplier = multiplier.add(multiplier_time);
        }

        processed_locks[i].time_adjusted_qty = quantity_fp.mul(multiplier);
        // Test with random address
        /*if (processed_locks[i].account === "0x69f2bA0b17C09Be07E16f85963a7a18ef05b5770") {
          console.log(`ADDRESS: ${processed_locks[i].account}, SYMBOL: ${sym}, QUANTITY: ${quantity_fp}, TIME: ${processed_locks[i].time_exp}, INTENT: ${(processed_locks[i].lock_dur_exp)}, MULTIPLIER TIME: ${multiplier_time.toDecimalString()}, TIME TOTAL: ${time_exp_total[sym]}, LOCK INTENT TOTAL: ${lock_intent_exp_total[sym]}, MULTIPLIER INTENT: ${multiplier_intent.toDecimalString()}, TIME ADJUSTED QTY: ${processed_locks[i].time_adjusted_qty}`)
        }*/
        time_adjusted_qty_total[sym].add(processed_locks[i].time_adjusted_qty);
    }
    console.log(`TIME-QUANTITY ADJUSTED TOTAL [ETH]:`)
    console.log(time_adjusted_qty_total['eth'])
    console.log(`TIME-QUANTITY ADJUSTED TOTAL [WETH]:`)
    console.log(time_adjusted_qty_total['weth'])
    console.log(`TIME-QUANTITY ADJUSTED TOTAL [USDB]:`)
    console.log(time_adjusted_qty_total['usdb'])


    /*
    Calculate multiplier as time weighted quantity / total twq, calculate total multiplier for validation
     */
    for (let i = 0; i < processed_locks.length; i++){
        const sym = processed_locks[i].symbol.toLowerCase();

        const multiplier = processed_locks[i].time_adjusted_qty;
        multiplier.div(time_adjusted_qty_total[sym]);
        // Test with random address
        /*if (processed_locks[i].account === "0x69f2bA0b17C09Be07E16f85963a7a18ef05b5770") {
          console.log(`ADDRESS: ${processed_locks[i].account}, MULTIPLIER: ${multiplier}`)
        }*/
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
        if (m.account.toLowerCase() === JUICE_GOLD_ORIGINAL_ADDRESS && env === "GOLD") {
          m.account = JUICE_GOLD_REPLACEMENT_ADDRESS
        }
        if (!account_totals[m.account]){
            account_totals[m.account] = {
                account: m.account,
                symbol: m.symbol,
                multiplier: m.multiplier,
                quantity: m.quantity,
                lock_time: m.lock_time,
            };
        }
        else {
            if (account_totals[m.account].symbol !== m.symbol){
              throw new Error(`Account ${m.account} has multiple symbols: ${account_totals[m.account].symbol} != ${m.symbol}`)
            }
            account_totals[m.account].multiplier.add(m.multiplier);
            account_totals[m.account].quantity += m.quantity;
            account_totals[m.account].lock_time += m.lock_time;
        }
    });
    
    const csv_rows = Object.values(account_totals).map(t =>
        `${t.account},${t.symbol},${t.multiplier.toDecimalString()}`
    );

    const csv_file = env+'-multiplier-distribution.csv';
    fs.writeFile(csv_file, csv_rows.join(`\n`), () => {
        console.log(`Wrote ${csv_file}`);
    });

})();
