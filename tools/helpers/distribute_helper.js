import {distribute_contract, provider} from "../../lib/contracts.js";
import {ACCOUNT_COUNT} from "../../lib/env.js";

const DISTRIBUTE_BATCH = process.env.DISTRIBUTE_BATCH || 100;
export const distributeAll = async () => {
  const iterations = Math.ceil(ACCOUNT_COUNT / DISTRIBUTE_BATCH)
  for (let i = 0; i < iterations; i++) {
    try {
      console.log(`Distributing from ${i*DISTRIBUTE_BATCH}`);
      const distribute = await distribute_contract.distribute(i*DISTRIBUTE_BATCH, DISTRIBUTE_BATCH)
      await provider.waitForTransaction(distribute.hash)
      console.log(`Distributed in tx ${distribute.hash}`)
    } catch (e) {
      throw new Error(`Error in final step: ${e}. Iteration: ${i}`)
    }
  }
}


