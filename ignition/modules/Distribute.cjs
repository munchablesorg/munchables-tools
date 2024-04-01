const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DistributeModule", (m) => {
  const dist = m.contract(
      "Distribute",
      [process.env.USDB_CONTRACT, process.env.WETH_CONTRACT,
            process.env.ETH_QUANTITY, process.env.USDB_QUANTITY, process.env.WETH_QUANTITY,
            process.env.LOCK_CONTRACT]
  );
  return { dist };
});
