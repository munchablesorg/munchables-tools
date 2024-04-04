import { CHALLENGE_SUFFIX, SOLVE_SUFFIX, CONTRACTS_SUFFIX, BATCHES_SUFFIX, BALANCE_SUFFIX } from '../suffixes.js';

const mockAxios = async (url, options) => {
  // Mock logic based on URL and options
  if (url.includes(BATCHES_SUFFIX)) {
    if (options.method === 'PUT') {
      return { data: { success: true, batchId: 'dummy-batch-id' } };
    } else if (options.method === 'GET') {
      return { data: { success: true, batch: { id: 'dummy-batch-id', status: 'Dummy status' } } };
    }
    // Add other conditions as necessary
  }

  // Default response
  return { data: { success: false } };
};

export default mockAxios;

