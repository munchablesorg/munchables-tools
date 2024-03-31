
## Install dependencies

```code
npm i
```

## Generating locks.csv file

This file is a csv with one row for each lock action

```code
node tools/get_locks.js
```

This will write cached data to the locks directory in the format locks-<block_number>.json with every lock seen in that 
block.

get_locks can be started with `-s <block_number` as a starting block and can be run in parallel to speed up scanning.

```code
node tools/process_locks.js
```

This will write the cached data to csv and display stats

## Collating raw data

The raw data needs to be collated to just have the data we need and to be a single row per account.

```code
node tools/collate_locks.js
```
This will write out `locks-collated.csv` which will be needed to populate the contract.

## Populating contract

The populate script will read data from `locks-collated.csv` and send them to the contract, you must have the owner key 
to populate.

```code
node tools/populate_distribute.js
```

## Verifying contract state

The verification script will compare all the data in the contract to your local `locks-collated.csv` file, this is done 
by hashing all of the addresses, quantities and token types from the contract data and the csv file.
    
```code
node tools/validate_csv_to_chain.js
```
Once the contract state is validated, the contract should be able to be sealed and will then wait for funding.

## Testing on a cloned mainnet

First use hardhat to start a new node from the contract directory

```code
npx hardhat node
```
Then run this from the tools directory

```code
node tools/local_fork_mainnet_test.js 
```