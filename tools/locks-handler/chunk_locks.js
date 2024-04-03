import fs from 'fs';
import path from 'path';
import readline from 'readline'

const ETH_PRICE = 4000; // Approximate value of ETH and WETH
const inputFile = 'locks-collated.csv';
const outputFile = 'locks-collated-value-ordered.csv';
const outputDir = 'lock-split';
const numFiles = parseInt(process.argv[2], 10) || 10; // Number of files from CLI argument or default to 10

// Function to calculate the dollar value for sorting without modifying the actual amount
const calculateUSDValueForSorting = (amount, currency) => {
  switch (currency) {
    case '1': // ETH
    case '3': // WETH
      return Number((BigInt(amount) * BigInt(ETH_PRICE)) / BigInt(1e18));
    case '2': // USDB
      return Number(BigInt(amount) / BigInt(1e18));
    default:
      console.error("Incorrect currency type");
      process.exit(1);
  }
};

const processFile = async () => {
  const fileStream = fs.createReadStream(inputFile);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let data = [];

  for await (const line of rl) {
    let [address, amount, currency] = line.split(',');
    let usdValue = calculateUSDValueForSorting(amount, currency);
    data.push({ address, amount, currency, usdValue });
  }

  // Sort by calculated USD value in ascending order without modifying the original amount
  data.sort((a, b) => a.usdValue - b.usdValue);

  // Write the original data to the ordered CSV, maintaining the original format
  const sortedData = data.map(({ address, amount, currency }) => `${address},${amount},${currency}`);
  fs.writeFileSync(outputFile, sortedData.join('\n'));

  // Split the sorted original data into numFiles CSVs
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const chunkSize = Math.ceil(data.length / numFiles);
  for (let i = 0; i < numFiles; i++) {
    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkData = chunk.map(({ address, amount, currency }) => `${address},${amount},${currency}`);
    fs.writeFileSync(path.join(outputDir, `chunk${i + 1}.csv`), chunkData.join('\n'));
  }
};

processFile().then(() => console.log('Processing complete.'));

