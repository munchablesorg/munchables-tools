import {BlastPointsAPI, MINIMUM_LIQUIDITY_TRANSFER_SIZE} from "../../lib/bindings/blast_points.js";
import fs from "node:fs";
import {parse} from "csv-parse";
import {FixedPoint} from "@hastom/fixed-point";
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    const env = process.env.REWARDS_TYPE;
    if (env !== 'YIELD') {
        throw new Error('REWARDS_TYPE must be set to YIELD')
    }
    const filename = env+'-multiplier-distribution.csv';

    const eth_balance= 14198507427192480000n;
    const usdb_balance = 23855794562385383852644n;
    const weth_balance = 5349481270614008950n;

    const eth_balance_bi = new FixedPoint(eth_balance, 18);
    const usdb_balance_bi = new FixedPoint(usdb_balance, 18);
    const weth_balance_bi = new FixedPoint(weth_balance, 18);

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
        let token_type = '';
        if (symbol === 'USDB') {
          token_type = 2;
          multiplier.mul(usdb_balance_bi);
        } else if (symbol === 'ETH') {
          token_type = 1;
          multiplier.mul(eth_balance_bi);
        } else if (symbol === 'WETH') {
          token_type = 3;
          multiplier.mul(weth_balance_bi);
        } else {
          throw new Error(`Unknown symbol: ${symbol}`)
        }
        if (parseFloat(multiplier.toDecimalString()) >= MINIMUM_LIQUIDITY_TRANSFER_SIZE) {
            all_transfers.push({account, token_type, quantity: multiplier.getBase().toString()});
        }
    }

    const all_transfers_csv = all_transfers.map(b => `${b.account},${b.quantity},${b.token_type}`);
    const outfile = env+'-distribution.csv';
    fs.writeFile(outfile, all_transfers_csv.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

})();
