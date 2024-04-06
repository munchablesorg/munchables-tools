import {BlastPointsAPI, MINIMUM_LIQUIDITY_TRANSFER_SIZE} from "../../lib/bindings/blast_points.js";
import fs from "node:fs";
import {parse} from "csv-parse";
import {FixedPoint} from "@hastom/fixed-point";
import dotenv from 'dotenv';
dotenv.config();

const prefix = process.env.REWARDS_PREFIX;

(async () => {
    const filename = process.env.REWARDS_TYPE+'-multiplier-distribution.csv';
    const type = process.env.REWARDS_TYPE === 'POINTS' ? 'LIQUIDITY' : 'DEVELOPER';
    const blast_api = new BlastPointsAPI(
        prefix,
        process.env.REWARDS_PRIVATE_KEY,
        process.env.REWARDS_CONTRACT,
        process.env.REWARDS_OPERATOR,
        process.env.REWARDS_TYPE,
        false
    );
    await blast_api.obtainBearerToken();
    const balance = await blast_api.getContractPointsBalance();
    let multiplier = process.env.REWARDS_ENV === 'testnet' ? 100000 : 1;
    let available = `${parseFloat(balance[type].available) * multiplier}`;
    const precision = available.length - available.indexOf('.') - 1;
    available += '0'.repeat(12 - precision);
    const big = BigInt(available.replace('.', ''));

    const blast_points = new FixedPoint(big, 18);

    let all_transfers = [];
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
            all_transfers.push({account, points: multiplier.toDecimalString()});
        }
        // console.log(batch);
    }

    const all_transfers_csv = all_transfers.map(b => `${b.account},${b.points}`);
    const outfile = process.env.REWARDS_TYPE+'-distribution.csv';
    fs.writeFile(outfile, all_transfers_csv.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

})();
