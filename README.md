
## Install dependencies

```code
npm i
```

## Initiating Event Sequence (assuming already deployed Distribute contract)

0. Use .env.example as a reference and fill in its associated environment
   variables to a .env file.
1. Generate or copy over your `locks-collated.csv` file to the root of the
   directory. This can be done from scratch by using the tutorial below on
   generating locks.csv and then collating the raw data.
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
   comes in here will be the wallet that is allowed to trigger the distribute
   functions in the next stage.
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
anvil --fork-url <insert blast rpc url here>
```
Then run this from the tools directory

```code
node fork-validation/full_test.js 
```
