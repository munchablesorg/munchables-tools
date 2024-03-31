import "dotenv/config";

const requiredEnv = [
  "NODE",
  "ACCOUNT_MANAGER_CONTRACT",
  "NFT_CONTRACT",
  "LOCK_CONTRACT",
];

export const ACCOUNT_COUNT = 3223;

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
