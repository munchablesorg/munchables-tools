import {LOCKS_FILE} from "../../lib/env.js";
import fs from "fs";
import {parse} from "csv-parse";
import {provider} from "../../lib/contracts.js";
import cliProgress from "cli-progress";

(async () => {
    const END_TIME = 1711491600;
    const TIME_EXPONENT = 2;
    const progress_bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progress_bar.start(5287, 0); // 5287 = lines in original csv

    const processed_locks = [];
    let quantity_total = {eth: 0n, usdb: 0n, weth: 0n};
    let time_exp_total = {eth: 0n, usdb: 0n, weth: 0n};

    const parser = fs
        .createReadStream(LOCKS_FILE)
        .pipe(parse({}));
    for await (const record of parser) {
        const [account, token_contract, symbol, quantity, , tx_hash] = record;
        const tx_receipt = await provider.getTransactionReceipt(tx_hash);
        const block = await provider.getBlock(tx_receipt.blockNumber);
        const lock_time = END_TIME - block.timestamp;
        processed_locks.push({account, token_contract, symbol, quantity, lock_time});

        const sym = symbol.toLowerCase();
        quantity_total[sym] += BigInt(quantity);
        const time_exp = BigInt(Math.pow(lock_time, TIME_EXPONENT));
        time_exp_total[sym] += time_exp;

        progress_bar.increment();
    }
    progress_bar.stop();

    console.log(`Found ${processed_locks.length} locks`);

    const ten_bil = 1000000000n;
    for (let i = 0; i < processed_locks.length; i++) {
        const sym = processed_locks[i].symbol.toLowerCase();

        const multiplier_quantity =
            Number(BigInt(processed_locks[i].quantity) / ten_bil) /
            Number(quantity_total[sym] / ten_bil);

        const multiplier_time =
            Math.pow(processed_locks[i].lock_time, TIME_EXPONENT) /
            Number(time_exp_total[sym]);

        processed_locks[i].multiplier = Number(multiplier_quantity) * multiplier_time;
    }

    console.log(processed_locks);
    let multiplier_total = 0;
    processed_locks.forEach(l => {
        multiplier_total += l.multiplier;
    });
    console.log(`Total multipliers : ${multiplier_total}`);

})();
