import {provider} from "../../lib/contracts.js";

if (process.argv.length < 3){
    console.error(`Usage : revert_snapshot.js <snapshot_hex>`);
    process.exit(1);
}

(async () => {
    const snapshot = process.argv[2];
    await provider.send('evm_revert', [snapshot]);
})();