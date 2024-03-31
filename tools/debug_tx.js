import {provider} from "../lib/contracts.js";

if (process.argv.length < 3 || process.argv[2].substring(0, 2) !== '0x'){
    console.error(`Usage: debug_tx.js <tx_hash>`);
    process.exit(1);
}
const tx_hash = process.argv[2];

(async (tx_hash) => {
    const response = await provider.send("debug_traceTransaction", [
        tx_hash,
        {"tracer": "callTracer"},
    ]);
    console.log(response);
    if (!response.error) {
        console.log('\x1b[32m%s\x1b[0m', `Transaction successful`);
    }
    else {
        console.log('\x1b[31m%s\x1b[0m', `Error : ${response.error}`);
    }
    process.exit(0);
})(tx_hash);