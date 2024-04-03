import fs from 'fs';
import readline from 'readline'

const inputFile = 'locks-collate.csv';

// Totals for each currency
let totalETH = BigInt(0);
let totalWETH = BigInt(0);
let totalUSDB = BigInt(0);

const processFile = async () => {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    let [address, amount, currency] = line.split(',');
    amount = BigInt(amount); // Convert amount to BigInt

    switch (currency) {
      case '1': // ETH
        totalETH += amount;
        break;
      case '2': // USDB
        totalUSDB += amount;
        break;
      case '3': // WETH
        totalWETH += amount;
        break;
      default:
        console.log(`Unknown currency type: ${currency}`);
    }
  }

  // Output the totals
  console.log(`Total ETH: ${totalETH}`);
  console.log(`Total WETH: ${totalWETH}`);
  console.log(`Total USDB: ${totalUSDB}`);
};

processFile().then(() => console.log('Totals calculated.'));

