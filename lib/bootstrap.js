import { sleep } from "./sleep.js";
import { provider } from "./contracts.js";
import { validate_env_variables } from "./env.js";

let caught_up = false;
export const bootstrap = async (
  catchup_from_block,
  real_time,
  events_handler,
  queue
) => {
  // console.log(`Waiting for network`, provider);
  await provider.detectNetwork();
  // console.log(`Network ready`);
  real_time(queue);

  let start_block, end_block, head_block;
  while (true) {
    try {
      head_block = await provider.getBlockNumber();

      if (catchup_from_block) {
        start_block = catchup_from_block;
        end_block = catchup_from_block + 1000;
        if (end_block >= head_block) {
          // continue from head
          catchup_from_block = 0;
          end_block = "latest";
        } else {
          catchup_from_block = end_block + 1;
        }
      } else {
        // Start 50 blocks back from head in addition to the real-time
        start_block = head_block - 50;
        end_block = "latest";
      }
      console.log(
        `Head block is ${head_block}, start = ${start_block}, end_block = ${end_block}`,
      );

      await events_handler(start_block, end_block, queue);

      if (!catchup_from_block && !caught_up) {
        console.log("Starting real-time listening");
        caught_up = true;
        // break;
      }
    } catch (e) {
      console.error(e.message);
    }

    if (caught_up){
      await sleep(60000);
    }
    else {
      await sleep(1500);
    }
  }
};
