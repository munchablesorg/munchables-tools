/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomicfoundation/hardhat-toolbox");
// require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
// require("@nomiclabs/hardhat-etherscan");
// require("hardhat-contract-sizer");
require("dotenv").config();
console.log(process.env.NODE_URL_URL);
console.log(process.env.PRIVATE_KEY);
module.exports = {
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      blast_sepolia: 'xxx',
      blast_mainnet: process.env.MAINNET_BLAST_EXPLORER_API_KEY,
    },
    customChains: [
      {
        network: "blast_sepolia",
        chainId: 168587773,
        urls: {
          apiURL: 'https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan',
          browserURL: "https://testnet.blastscan.io"
        }
      },
      {
        network: "blast_mainnet",
        chainId: 81457,
        urls: {
          apiURL: process.env.NODE_URL,
          browserURL: "https://blastexplorer.io"
        }
      }
    ]
  },
  defaultNetwork: "hardhat",
  networks: {
    blast_sepolia: {
      url: process.env.NODE_URL,
      chainId: 168587773,
      accounts: [process.env.PRIVATE_KEY]
    },
    blast_mainnet: {
        url: process.env.NODE_URL,
        chainId: 81457,
        accounts: [process.env.PRIVATE_KEY]
    }
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 4000000
  }
};
