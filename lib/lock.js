import {BigNumber, ethers} from "ethers";

const eth_address = '0x0000000000000000000000000000000000000000';
const usdb_address = "0x4300000000000000000000000000000000000003";
const weth_address = "0x4300000000000000000000000000000000000004";


export class Lock {
    token_contract = '';
    tx_hash = '';
    account = '';
    quantity = BigNumber.from(0);
    lock_duration = BigNumber.from(0);
    from_event = false;
    constructor(data, tx_hash, from) {
        if (data){
            this.token_contract = data._token_contract;
            this.quantity = data._quantity;
            this.lock_duration = data._lock_duration;
        }
        this.tx_hash = tx_hash;
        this.account = from;

        if (data && data._account){
            this.from_event = true;
        }
    }

    static from_json_data(data) {
        const lock = new Lock();
        lock.token_contract = data.token_contract;
        lock.quantity = data.quantity;
        lock.lock_duration = data.lock_duration;
        lock.tx_hash = data.tx_hash;
        lock.account = data.account;
        return lock;
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
        return `${this.account},${this.token_contract},${this.get_symbol()},${this.quantity},${this.lock_duration},${this.tx_hash},${this.from_event}`;
        // return `${this.account},${this.token_contract},${this.get_symbol()},${ethers.utils.formatEther(this.quantity)},${this.lock_duration},${this.tx_hash},${this.from_event}`;
    }

}