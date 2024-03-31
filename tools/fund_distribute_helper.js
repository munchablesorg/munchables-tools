import {distribute_contract} from "../lib/contracts.js";
import {ACCOUNT_COUNT} from "../lib/env.js";

const QUEUE_LENGTH = process.env.QUEUE_LENGTH;
export const fundDistribute = async () => {
  const iterations = Math.ceil(ACCOUNT_COUNT / QUEUE_LENGTH)
  for (let i = 0; i < iterations; i++) {
    try {
      const length = i === iterations - 1 ? ACCOUNT_COUNT % QUEUE_LENGTH : QUEUE_LENGTH
      const distribute = await distribute_contract.distribute(i*QUEUE_LENGTH, length)
    } catch (e) {
      throw new Error(`Error in final step: ${e}. Iteration: ${i}`)
    }
  }
}


