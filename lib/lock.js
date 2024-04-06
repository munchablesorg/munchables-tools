import {ethers} from "ethers";
import {provider} from "./contracts.js";
const eth_address = '0x0000000000000000000000000000000000000000';
const usdb_address = "0x4300000000000000000000000000000000000003";
const weth_address = "0x4300000000000000000000000000000000000004";


export class Lock {
    token_contract = '';
    tx_hash = '';
    account = '';
    quantity = 0n;
    lock_duration = 0n;
    from_event = false;
    block_number = 0;
    block_timestamp = 0;
    constructor(data, tx_hash, from) {
        if (data){
            this.token_contract = data._token_contract;
            this.quantity = data._quantity;
            this.lock_duration = data._lock_duration;
        }
        this.tx_hash = tx_hash;
        this.account = from;

        this.from_event = !!(data && data._account);
    }

    static from_json_data(data) {
        const lock = new Lock();
        // old syle logs
        let quantity = data.quantity;
        let lock_duration = data.lock_duration;
        if (quantity.hex){
            quantity = quantity.hex;
        }
        if (lock_duration.hex){
            lock_duration = lock_duration.hex;
        }
        lock.quantity = BigInt(quantity);
        lock.lock_duration = BigInt(lock_duration);

        lock.token_contract = data.token_contract;
        lock.tx_hash = data.tx_hash;
        lock.account = data.account;
        lock.block_number = data.block_number;
        lock.block_timestamp = data.block_timestamp;
        // console.log(lock, data);
        // process.exit(0);
        return lock;
    }

    async add_block_data(block_number = 0) {
        block_number = parseInt(block_number);
        if (!block_number || isNaN(block_number)){
            const tx_receipt = await provider.getTransactionReceipt(this.tx_hash);
            block_number = tx_receipt.blockNumber;
        }
        const block = await provider.getBlock(block_number);
        this.block_number = block_number;
        this.block_timestamp = block.timestamp;
    }
    get_symbol() {
        let symbol = '';
        switch (this.token_contract){
            case eth_address:
                symbol = 'ETH';
                break;
            case usdb_address:
                symbol = 'USDB';
                break;
            case weth_address:
                symbol = 'WETH';
                break;
        }
        return symbol;
    }

    toCSV() {
        return `${this.account},${this.token_contract},${this.get_symbol()},${this.quantity},${this.lock_duration},${this.tx_hash},${this.block_timestamp}`;
        // return `${this.account},${this.token_contract},${this.get_symbol()},${ethers.utils.formatEther(this.quantity)},${this.lock_duration},${this.tx_hash},${this.from_event}`;
    }

}
