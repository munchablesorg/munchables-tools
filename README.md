
## Install dependencies (use node v18+)

Requires : anvil 0.2.0

```code
npm i
```

## Deploy Distribute contract
```
npx hardhat ignition deploy ignition/modules/Distribute.cjs --network
blast_mainnet | blast_sepolia
```

## Initiating Event Sequence (assuming already deployed Distribute contract)

0. Use `.env.example` as a reference and fill in its associated environment
   variables to a `.env` file. This includes having an already deployed
   `Distribute` contract.
1. Generate or copy over your `locks-collated.csv` file to the root of the
   directory. This can be done from scratch by using the tutorial below on
   generating `locks.csv` and then collating the raw data.
2. Run the following command to initiate data population, confirm valid data
   on-chain, and then seal the data for the next stage:
```code
node tools/stages/0-populate.js
node tools/stages/1-validate.js
node tools/stages/2-seal.js
```
3. Use the Multisig and approve the USDB and WETH transfer to the distribution
   contract.
4. Call the `fund(address)` function from the Multisig. Note: The address that
   is sent as a parameter will be the wallet that is allowed to trigger the distribute functions in the next stage.
5. Make sure the `.env` file is updated with whichever private key is able to
   call the distribute function (specified in the last step) and call the
   following script:
```code
node tools/stages/4-distribute.js
```
6. Validate that everything was distributed using the final stage:
```code
node tools/stages/5-validate_distribution.js
```
7. Validate the final balances check:
```code
node tools/stages/6-validate_balances.js
```
**NOTE:** This will only work consistently on a mainnet clone. On real mainnet,
people will start to move balances around post-distribution so the only way to get this
check to work would be by making a change to the code to accept the block number
of the final distribution transaction.

## Generating locks.csv file

This file is a csv with one row for each lock action

```code
node tools/locks-handler/get_locks.js
```

This will write cached data to the locks directory in the format locks-<block_number>.json with every lock seen in that 
block.

get_locks can be started with `-s <block_number` as a starting block and can be run in parallel to speed up scanning.

```code
node tools/locks-handler/process_locks.js
```

This will write the cached data to csv and display stats

## Collating raw data

The raw data needs to be collated to just have the data we need and to be a single row per account.

```code
node tools/locks-handler/collate_locks.js
```
This will write out `locks-collated.csv` which will be needed to populate the contract.

## Populating contract

The populate script will read data from `locks-collated.csv` and send them to the contract, you must have the owner key 
to populate.

```code
node tools/stages/0-populate.js
```

## Verifying contract state

The verification script will compare all the data in the contract to your local `locks-collated.csv` file, this is done 
by hashing all of the addresses, quantities and token types from the contract data and the csv file.
    
```code
node tools/stages/1-validate.js
```
Once the contract state is validated, the contract should be able to be sealed and will then wait for funding.

## Testing on a cloned mainnet

First use anvil to start a new node from the contract directory

```code
anvil --fork-url <insert blast rpc url here>
```
Then, deploy the Distribute contract using the command above from `Deploy
Distribute contract`. Make sure
to then copy that address into your `.env` under the `DISTRIBUTE_CONTRACT` variable and ensure that `NODE_URL` is pointing to your local anvil node. Then run this from the tools directory

```code
node tools/fork-validation/full_test.js 
```
