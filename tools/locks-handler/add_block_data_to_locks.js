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
            const re = new RegExp(/^locks\/locks-([0-9]*)/, 'i');
            const m = files[i].match(re);
            const block_number = m[1];
            const locks = JSON.parse(json_str.toString()).map((lock) => {
                return Lock.from_json_data(lock);
            });
            // console.log(locks);

            for (let j = 0; j < locks.length; j++){
                const sym = locks[j].get_symbol().toLowerCase();
                if (!block_number || !locks[j].block_timestamp){
                    await locks[j].add_block_data(block_number);
                }
                locks[j].quantity = locks[j].quantity.toString();
                locks[j].lock_duration = locks[j].lock_duration.toString();
            }

            fs.writeFile(files[i], JSON.stringify(locks), () => {
                console.log(`Wrote csv to ${files[i]}`);
            });
        }
    } catch (err) {
        console.error(err);
    }
})();
