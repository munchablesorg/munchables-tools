
# Overview

To distribute the funds to all users, we use the following process (high-level
overview):
- Read on-chain data for all locks and create file with 1 line per lock.
- Collate that file to totals with 1 line per account.
- Populate the contract with the data retrieved from that file.
- Verify that the data in the contract matches the csv via a hash-check.
- Lock the contract so that no more data can be added or changed.
- Handover contract access to owners of Msig/Blast.
- They will do their additional verification checks (including running local clone test) and send funds to the contract, specifying which wallet is allowed to call the distribute function in the final stage.
    - In the case of a mistake at this stage or later, we have added a rescue
      function that the Msig can call to retract all funds.
- Distribute the funds via multiple distribute calls until all funds are safely sent back to users.
- Do a last stage verification to ensure all funds have been distributed and
  there is nothing left in the Distribute contract.

## Directory structure
`/contracts` - Holds the Distribute contract and its interfaces

`/ignition` - Holds the deploy script for the Distribute contract

`/lib` - Library helpers and ABI

`/tools/fork-validation` - Full on-chain test

`/tools/helpers` - Holds the core functionality of the different stages

`/tools/locks-handler` - All lock retrieval functionality is held here

`/tools/stages` - Scripts for each individual stage

`/tools/utils` - Various utility scripts

# Instructions

## Install dependencies (use node v18+)

Requires: node v18.1.0
Requires: anvil v0.2.0 (if running local clone) 

```code
npm i
```

## Deploy Distribute contract
```
npx hardhat ignition deploy ignition/modules/Distribute.cjs --network
blast_mainnet | blast_sepolia
```

## Initiating Event Sequence

0. Use `.env.example` as a reference and fill in its associated environment
   variables to a `.env` file. **NOTE:** This includes having an already deployed
   `Distribute` contract from the above step.
1. Generate or copy over your `locks-collated.csv` file to the root of the
   directory. This can be done from scratch by using the tutorial below on
   generating `locks.csv` and then collating the raw data. Otherwise, we can
   send over a copy.
2. Run the following command to initiate data population, confirm valid data
   on-chain, and then seal the data for the next stage:
```code
node tools/stages/-1-get_initial_balances.js
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
6. Validate that everything was distributed using the next stage:
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

## Deleting cache

To delete all script caching mechanisms, remove the directories `cache`,
`locks`, `ignition/deployments`.

## Generating locks.csv file

This file is a csv with one row for each lock action. We use `get_locks_parallel.js` below
instead of `get_locks.js` because of speed but you can use either.

```code
node tools/locks-handler/get_locks_parallel.js
```

This will write cached data to the locks directory in the format locks-<block_number>.json with every lock seen in that 
block.

get_locks can be started with `-s <block_number` as a starting block for manual scanning.

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

For the rescue function test, run:
```code
node tools/fork-validation/rescue_test.js
```

Everytime a major stage of the process is successfully completed, the associated
snapshot is stored in `cache/stages.json` under stage_snapshots. You can
manually revert back to old stages by passing the snapshot hex identifier to
`tools/utils/revert_snapshot.js <snapshot>`.
