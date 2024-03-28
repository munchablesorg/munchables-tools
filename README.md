`$ npm i`

`$ source envs-prod.sh.example`

`$ node tools/get_locks.js`

This will write cached data to the locks directory in the format locks-<block_number>.json with every lock seen in that block.

get_locks can be started with `-s <block_number` as a starting block and can be run in parallel to speed up scanning.

`$ node tools/process_locks.js`

This will write the cached data to csv and display stats
