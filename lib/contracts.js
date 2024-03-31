import {ethers} from "ethers";
import { account_manager_abi, nft_abi, claim_abi, lock_abi, erc20_abi, distribute_abi } from "./abis.js";
import { validate_env_variables } from "./env.js";
import {keepAlive} from "./keepalive.js";
// Setup environment
validate_env_variables();

class AutoNonceWallet extends ethers.Wallet {
    _noncePromise = null;
    sendTransaction(transaction) {
            if (transaction.nonce == null) {
                if (this._noncePromise == null) {
                    this._noncePromise = this.provider.getTransactionCount(this.address, 'pending');
                }
                transaction.nonce = this._noncePromise;
                this._noncePromise = this._noncePromise.then(nonce => (nonce + 1))
        }
        return super.sendTransaction(transaction);
    }
}
let _provider;
if (process.env.NODE.substring(0, 4) === 'wss:'){
    // console.log(`Using WSS node`);
    _provider = new ethers.providers.WebSocketProvider(process.env.NODE);
    keepAlive({
        provider: _provider,
        onDisconnect: (err) => {
            console.error('The ws connection was closed', JSON.stringify(err, null, 2));
            process.exit(1);
        },
    });
}
else {
    // console.log(`Using JSON RPC node`);
    _provider = new ethers.providers.JsonRpcProvider(process.env.NODE);
}

export const provider = _provider;
let signer = provider, signer_auto = provider;
if (process.env.PRIVATE_KEY){
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    signer_auto = new AutoNonceWallet(process.env.PRIVATE_KEY, provider);
}

export const account_contract = new ethers.Contract(
    process.env.ACCOUNT_MANAGER_CONTRACT,
    account_manager_abi,
    signer,
);
export const nft_contract = new ethers.Contract(
    process.env.NFT_CONTRACT,
    nft_abi,
    signer,
);

export const claim_contract = new ethers.Contract(
    process.env.CLAIM_CONTRACT,
    claim_abi,
    signer
);
export const lock_contract = new ethers.Contract(
    process.env.LOCK_CONTRACT,
    lock_abi,
    signer
);
export const distribute_contract = new ethers.Contract(
    process.env.DISTRIBUTE_CONTRACT,
    distribute_abi,
    signer
);

export const usdb_contract = new ethers.Contract(
    process.env.USDB_CONTRACT,
    erc20_abi,
    signer
);
export const weth_contract = new ethers.Contract(
    process.env.WETH_CONTRACT,
    erc20_abi,
    signer
);
export const account_contract_auto = new ethers.Contract(
    process.env.ACCOUNT_MANAGER_CONTRACT,
    account_manager_abi,
    signer_auto,
);
export const nft_contract_auto = new ethers.Contract(
    process.env.NFT_CONTRACT,
    nft_abi,
    signer_auto,
);

export const claim_contract_auto = new ethers.Contract(
    process.env.CLAIM_CONTRACT,
    claim_abi,
    signer_auto
);
export const lock_contract_auto = new ethers.Contract(
    process.env.LOCK_CONTRACT,
    lock_abi,
    signer_auto
);
