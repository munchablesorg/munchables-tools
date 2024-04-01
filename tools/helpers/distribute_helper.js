import {distribute_contract, provider} from "../../lib/contracts.js";
import {ACCOUNT_COUNT} from "../../lib/env.js";
import cliProgress from "cli-progress";

const progress_bar = new cliProgress.SingleBar({linewrap: false}, cliProgress.Presets.shades_classic);

const DISTRIBUTE_BATCH = process.env.DISTRIBUTE_BATCH || 100;
export const distributeAll = async (customSigner) => {
  const iterations = Math.ceil(ACCOUNT_COUNT / DISTRIBUTE_BATCH)
  progress_bar.start(iterations, 0);

  for (let i = 0; i < iterations; i++) {
    try {
      console.log(`Distributing from ${i*DISTRIBUTE_BATCH}`);
      let distribute
      if (customSigner) {
          distribute = await distribute_contract.connect(customSigner).distribute(i*DISTRIBUTE_BATCH, DISTRIBUTE_BATCH)
      } else {
          distribute = await distribute_contract.distribute(i*DISTRIBUTE_BATCH, DISTRIBUTE_BATCH)
      }
      await provider.waitForTransaction(distribute.hash)
      console.log(`Distributed in tx ${distribute.hash}`)

      progress_bar.update(i + 1);
    } catch (e) {
      throw new Error(`Error in distribute step: ${e}. Iteration: ${i}`)
    }
  }

  progress_bar.stop();
}


