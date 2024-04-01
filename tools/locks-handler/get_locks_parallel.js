// import dotenv from 'dotenv';
// dotenv.config();
// if (process.env.NODE_URL_REAL && (process.env.NODE_URL_REAL !== process.env.NODE_URL_REAL)){
//     process.env.NODE_URL = process.env.NODE_URL_REAL;
// }
import child_process from 'child_process';
import {END_BLOCK, START_BLOCK} from "../../lib/env.js";

const child_script_path = './tools/locks-handler/get_locks.js';
const CHUNKS = process.argv[2] || 10;
const children = [];


const close_children = () => {
    for (let i = 0; i < children.length; i++){
        children[i].kill('SIGHUP');
    }
}
process.on('SIGTERM', close_children);
process.on('SIGINT', close_children);
const launch = async (start_block, end_block) => {

    const child_argv = [
        '-s',
        `${start_block}`,
        '-e',
        `${end_block}`
    ];

    const child = child_process.fork(child_script_path, child_argv);
    child.on('exit', (code, signal) => {
        if (code === 0) {
            console.log(`Child exited normally`);
        }
        else if (signal && code === null) {
            console.log(`Child exited by signal`, signal);
        }
        else {
            console.error(`Child exited with error ${code}, aborting`);
            process.exit(1);
        }
    });
    children.push(child);

    return child;
}

(async () => {
    console.log(`Spawning ${CHUNKS} children`);
    let start = START_BLOCK;
    const stride = Math.floor((END_BLOCK - START_BLOCK) / CHUNKS);
    let end = start + stride;
    while (true){
        if (end > END_BLOCK){
            end = END_BLOCK;
        }
        await launch(start, end);

        start = end;
        end = start + stride;

        if (start >= END_BLOCK){
            console.log(`Done spawning child processes`);
            break;
        }
    }
})();