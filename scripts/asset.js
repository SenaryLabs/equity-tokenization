// scripts/asset.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the deployed contract address from environment or hard-code it if available
  const tokenizedAssetAddress = process.env.TOKENIZED_ASSET_ADDRESS;

  console.log("Equity Tokenization Address: ", tokenizedAssetAddress);

  /***
   *
   * Crypto assets (BTC, ETH, etc.) are typically represented with 18 decimals.
   * Stablecoins (USDC, USDT, etc.) are represented with 6 decimals (since most stablecoins like USDC/USDT have 6 decimal places).
   * Equities (stocks like TSLA, AAPL, etc.) should be represented with 0 decimals, since stock trading is typically done in whole units (e.g., 1 share = 1 unit).
   */

  // Parameters for the new asset
  //const symbol = "BTCUSD"; // Asset symbol
  //const assetType = 0; // 0 for STOCK, 1 for ETF
  //const decimals = 18; // Number of decimals for the asset
  const initialSupply = 0; //ethers.parseUnits("0", 18); // Initial supply (e.g., 1000 units)

  const symbol = "NVDA";//"QMCO";
  const decimals = 0;
  const assetType = 1; // 0 for STOCK, 1 for ETF

  try {
    // Attach to the deployed contract
    const TokenizedAsset = await ethers.getContractFactory(
      "TokenizedAsset",
    );
    const tokenizedAsset = await TokenizedAsset.attach(
      tokenizedAssetAddress
    );

    console.log(`Adding asset ${symbol}...`);

    // Send transaction to add asset
    const tx = await tokenizedAsset.addAsset(
      symbol,
      decimals,
      initialSupply
    );
    console.log("Transaction submitted. Hash:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      console.error("Transaction failed. Receipt:", receipt);
    } else {
      console.log(
        `Asset ${symbol} added successfully. Transaction confirmed: ${receipt}`
      );
    }

    // Get the deployer's signer
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    // Get the collateral token and calculate required collateral 100,000,000
    const collateralTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;

    await checkAllowance(
      collateralTokenAddress,
      tokenizedAssetAddress,
      deployerAddress,
      100000000
    );
  } catch (error) {
    console.error("Error adding asset", error);
  }
}

async function checkAllowance(
  collateralTokenAddress,
  equityTokenisationAddress,
  collateralRequired = 4090000000000000000 // Default to 1,000,000 USDC 2090000000000000000
) {
  // Get the deployer's signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const CollateralToken = await ethers.getContractAt(
    "ERC20",
    collateralTokenAddress
  );

  // Check allowance
  const currentAllowance = await CollateralToken.allowance(
    deployerAddress,
    equityTokenisationAddress
  );
  console.log(`Current allowance: ${currentAllowance.toString()} USDC.`);

  if (currentAllowance < collateralRequired) {
    const approveAmount = ethers.parseUnits("100", 6);
    console.log(
      `Approving additional collateral: ${approveAmount.toString()} USDC...`
    );
    const approvalTx = await CollateralToken.connect(deployer).approve(
      equityTokenisationAddress,
      approveAmount
    );
    await approvalTx.wait();
    console.log("Approval transaction confirmed.");
  } else {
    console.log("Sufficient allowance already exists. Skipping approval.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
