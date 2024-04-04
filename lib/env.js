import "dotenv/config";

const requiredEnv = [
  "NODE_URL",
  "ACCOUNT_MANAGER_CONTRACT",
  "NFT_CONTRACT",
  "LOCK_CONTRACT",
];

export const ACCOUNT_COUNT = process.env.ACCOUNT_COUNT || 3223;
export const START_BLOCK = 1132211;
export const END_BLOCK = 1344734;
export const LOCK_DIR = 'locks';
export const LOCKS_FILE = 'locks.csv';
export const LOCK_COLLATED_FILE = 'locks-collated.csv';
export const LOCK_COLLATED_TESTNET_FILE = 'locks-collated-test.csv';

export function validate_env_variables() {
  const unsetEnv = requiredEnv.filter((envName) => !process.env[envName]);
  if (unsetEnv.length > 0) {
    console.error(
      "Missing required environment variables:",
      unsetEnv.join(", "),
    );
    process.exit(1); // Exit with error code
  }
}
