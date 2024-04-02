import fs from "fs";
import path from "path";
import {Lock} from '../../lib/lock.js';
import {ethers} from "ethers";
import {provider, usdb_contract, weth_contract} from "../../lib/contracts.js";
import {LOCKS_FILE} from "../../lib/env.js";


(async () => {
    const folder_name = 'locks';
    let csv = '';
    const totals = {
        eth: 0n,
        usdb: 0n,
        weth: 0n
    };
    try {
        const files = fs.readdirSync(folder_name).map(filename => {
            return path.join(folder_name, filename);
        });
        // console.log(files);

        for (let i = 0; i < files.length; i++){
            const json_str = fs.readFileSync(files[i]);
            const locks = JSON.parse(json_str.toString()).map((lock) => {
                return Lock.from_json_data(lock);
            });
            // console.log(locks);

            locks.forEach((lock) => {
                const sym = lock.get_symbol().toLowerCase();
                if (lock.quantity){
                    totals[sym] = totals[sym] + lock.quantity;
                    // console.log(lock.toCSV());
                    csv += lock.toCSV() + '\n';
                }
            });
        }

        fs.writeFile(LOCKS_FILE, csv, () => {
            console.log(`Wrote csv to locks.csv`);
        });

        const safe_account = '0x4D2F75F1cF76C8689b4FDdCF4744A22943c6048C';
        const eth_balance_safe = await provider.getBalance(safe_account);
        // const usdb_balance_safe = await usdb_contract.balanceOf(safe_account);
        // const weth_balance_safe = await weth_contract.balanceOf(safe_account);
        const weth_balance_safe = BigInt('7350007073554095000000');
        const usdb_balance_safe = BigInt('7760284973700910000000000');
        // console.log(usdb_balance_safe);

        console.log(`Safe Account : ${safe_account}`);
        const write_log = (sym, total, safe_total) => {
            const get_word = (t, st) => {
                if (st > t){
                    return 'surplus';
                }
                return 'deficit';
            }
            // console.log(sym, total, safe_total);
            console.log(`${sym} : ${ethers.formatEther(total)} accounted for ` +
                `(${ethers.formatEther(safe_total - total)} ${get_word(total, safe_total)})`);
        }
        write_log('ETH', totals.eth, eth_balance_safe);
        write_log('USDB', totals.usdb, usdb_balance_safe);
        write_log('WETH', totals.weth, weth_balance_safe);

        process.exit(0);

    } catch (err) {
        console.error(err);
    }
})();
