import "dotenv/config";

const requiredEnv = [
  "NODE",
  "ACCOUNT_MANAGER_CONTRACT",
  "NFT_CONTRACT",
  "IPFS_PREFIX",
  "IPFS_API_KEY",
  "IPFS_API_URL",
  "RSA_PRIVATE_KEY",
];

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
