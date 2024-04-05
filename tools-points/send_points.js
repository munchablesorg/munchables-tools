import {BlastPointsAPI, BlastPointsTransfer, MINIMUM_LIQUIDITY_TRANSFER_SIZE} from "../lib/bindings/blast_points.js";
import fs from "node:fs";
import {LOCKS_FILE} from "../lib/env.js";
import {parse} from "csv-parse";
import {FixedPoint} from "@hastom/fixed-point";
import {sleep} from "../lib/sleep.js";

const prefix = process.env.POINTS_PREFIX;

(async () => {
    const filename = 'reward-distribution.csv';

    const blast_api = new BlastPointsAPI(
        prefix,
        process.env.POINTS_PRIVATE_KEY,
        process.env.POINTS_CONTRACT,
        process.env.POINTS_OPERATOR,
        'POINTS',
        false
    );
    await blast_api.obtainBearerToken();
    const balance = await blast_api.getContractPointsBalance();
    let available = `${parseFloat(balance.LIQUIDITY.available) * 100000}`;
    const precision = available.length - available.indexOf('.') - 1;
    available += '0'.repeat(12 - precision);
    const big = BigInt(available.replace('.', ''));

    const blast_points = new FixedPoint(big, 18);

    let batch = [], all_transfers = [];
    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    for await (const record of parser) {
        const [account, symbol, _multiplier] = record;

        const precision = _multiplier.length - _multiplier.indexOf('.') - 1;
        const _multiplier_str = _multiplier + '0'.repeat(18 - precision);
        const _multiplier_big = BigInt(_multiplier_str.replace('.', ''));
        const multiplier = new FixedPoint(_multiplier_big, 18);
        multiplier.mul(blast_points);
        multiplier.div(new FixedPoint(3n, 0));

        if (parseFloat(multiplier.toDecimalString()) >= MINIMUM_LIQUIDITY_TRANSFER_SIZE){
            batch.push({account, points: multiplier.toDecimalString()});
            all_transfers.push({account, points: multiplier.toDecimalString()});
        }
        // console.log(batch);

        if (batch.length === 20){
            await blast_api.submitBatch(
                batch.map(t => {
                    return new BlastPointsTransfer(t.account, t.points)
                })
            );
            batch = [];
            break;
        }
    }
    if (batch.length > 0){
        await blast_api.submitBatch(
            batch.map(t => {
                new BlastPointsTransfer(account, multiplier.toDecimalString())
            })
        );
    }

    console.log('All batches sent');

    // console.log(available, precision, big);
    console.log(`${all_transfers.length} items in the batch`);
    const all_transfers_csv = all_transfers.map(b => `${b.account},${b.points}`);
    const outfile = 'points-transfers.csv';
    fs.writeFile(outfile, all_transfers_csv.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

    while (true) {
        const statuses = await blast_api.getAllBatchStatuses();
        console.log(statuses);
        await sleep(2000);
    }

})();