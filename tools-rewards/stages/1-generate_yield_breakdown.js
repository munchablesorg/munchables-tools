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

    const eth_balance= 14198507427192479966n;
    const usdb_balance = 23858506606245484292314n;
    const weth_balance = 5349481270614008950n;
    const balances = {
        ETH: eth_balance,
        USDB: usdb_balance,
        WETH: weth_balance
    };
    const totals = {
        ETH: 0n,
        USDB: 0n,
        WETH: 0n
    };
    const eth_balance_bi = new FixedPoint(eth_balance, 18);
    const usdb_balance_bi = new FixedPoint(usdb_balance, 18);
    const weth_balance_bi = new FixedPoint(weth_balance, 18);

    let all_transfers = [];
    const parser = fs
        .createReadStream(filename)
        .pipe(parse({}));
    
    const records = [];
    for await (const record of parser) {
        records.push(record);
    }
    records.forEach((record, index, array) => { 
        const [account, symbol, _multiplier] = record;
        const precision = _multiplier.length - _multiplier.indexOf('.') - 1;
        const _multiplier_str = _multiplier + '0'.repeat(18 - precision);
        const _multiplier_big = BigInt(_multiplier_str.replace('.', ''));
        let multiplier = new FixedPoint(_multiplier_big, 18);
        let token_type = '';
        const isLastOccurrence = array.slice(index + 1).findIndex(r => r[1] === symbol) === -1;

        if (isLastOccurrence) {
            const remaining = balances[symbol] - totals[symbol];
            const finalMultiplier = new FixedPoint(remaining, 18);
            multiplier = finalMultiplier;
        } else {
          if (symbol === 'USDB') {
            multiplier.mul(usdb_balance_bi);
          } else if (symbol === 'ETH') {
            multiplier.mul(eth_balance_bi);
          } else if (symbol === 'WETH') {
            multiplier.mul(weth_balance_bi);
          } else {
            throw new Error(`Unknown symbol: ${symbol}`)
          }
        }
        if (symbol === 'USDB') {
          token_type = 2;
        } else if (symbol === 'ETH') {
          token_type = 1;
        } else if (symbol === 'WETH') {
          token_type = 3;
        } else {
          throw new Error(`Unknown symbol: ${symbol}`)
        }
        totals[symbol] += multiplier.getBase();
        all_transfers.push({account, token_type, quantity: multiplier.getBase().toString()});
    });
    console.log(totals);
    const all_transfers_csv = all_transfers.map(b => `${b.account},${b.quantity},${b.token_type}`);
    const outfile = env+'-distribution.csv';
    fs.writeFile(outfile, all_transfers_csv.join('\n'), () => {
        console.log(`Wrote ${outfile}`);
    });

})();
