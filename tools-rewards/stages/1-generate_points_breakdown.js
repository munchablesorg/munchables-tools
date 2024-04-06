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
        process.env.REWARDS_TYPE
    );
    await blast_api.obtainBearerToken();
    const balance = await blast_api.getContractPointsBalance();
    // use 1/10 of available points for testnet
    let multiplier = process.env.REWARDS_ENV === 'testnet' ? 100000 : 1000000;
    let available = `${14193.23366764544 * multiplier}`;

    const precision = available.length - available.indexOf('.') - 1;
    available += '0'.repeat(12 - precision);
    const big = BigInt(available.replace('.', ''));

    let usdb_proportion
    let weth_proportion
    let eth_proportion

    if (process.env.REWARDS_ENV === 'mainnet' && parseFloat(balance[type].finalizedSentCumulative) > 0){
        throw new Error(`Cannot proceed if there are previously finalised batches`);
    }
    const earned_cum = parseFloat(balance['LIQUIDITY'].earnedCumulative)
    usdb_proportion = FixedPoint.fromDecimal(parseFloat(balance['LIQUIDITY'].byAsset['USDB'].earnedCumulative) / earned_cum, 4)
    weth_proportion = FixedPoint.fromDecimal(parseFloat(balance['LIQUIDITY'].byAsset['WETH'].earnedCumulative) / earned_cum, 4)
    eth_proportion = FixedPoint.fromDecimal(parseFloat(balance['LIQUIDITY'].byAsset['ETH'].earnedCumulative) / earned_cum, 4)

    console.log('Proportions')
    console.log(`USDB: ${usdb_proportion.toDecimalString()}`)
    console.log(`WETH: ${weth_proportion.toDecimalString()}`)
    console.log(`ETH: ${eth_proportion.toDecimalString()}`)

    const blast_points = new FixedPoint(big, 18);

    let total = 0
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
        if (symbol === 'USDB') {
          multiplier.mul(usdb_proportion);
        } else if (symbol === 'ETH') {
          multiplier.mul(eth_proportion);
        } else if (symbol === 'WETH') {
          multiplier.mul(weth_proportion);
        } else {
          throw new Error(`Unknown symbol: ${symbol}`)
        }
        total += parseFloat(multiplier.toDecimalString());
        if (parseFloat(multiplier.toDecimalString()) >= MINIMUM_LIQUIDITY_TRANSFER_SIZE) {
            all_transfers.push({account, points: multiplier.toDecimalString()});
        }
        // console.log(batch);
    }
    const delta = parseFloat(balance[type].available) * multiplier / 1000000 - total
    if (delta > 0.00001) { 
        throw new Error(`Problem with points calculation: ${total} != ${parseFloat(balance[type].available)}`);
    }

    const all_transfers_csv = all_transfers.map(b => `${b.account},${b.points}`);
    console.log("TOTAL " + process.env.REWARDS_TYPE + ": " + total)
    const outfile = process.env.REWARDS_TYPE+'-distribution.csv';
    fs.writeFile(outfile, all_transfers_csv.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

})();
