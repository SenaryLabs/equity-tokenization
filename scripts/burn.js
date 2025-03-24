// scripts/burn-token.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Retrieve the deployed TokenizedAsset contract address from .env
  const tokenizedAssetAddress = process.env.TOKENIZED_ASSET_ADDRESS;
  if (!tokenizedAssetAddress) {
    throw new Error("Missing required environment variable: TOKENIZED_ASSET_ADDRESS");
  }

  // Attach to the deployed TokenizedAsset contract
  const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
  const tokenizedAsset = await TokenizedAsset.attach(tokenizedAssetAddress);

  // Get the connected wallet (default signer)
  const [deployer] = await ethers.getSigners();
  console.log(`Connected with address: ${deployer.address}`);

  // Get the token ID; default to 0 if not provided in .env
  const tokenId = process.env.TOKEN_ID ? parseInt(process.env.TOKEN_ID) : 0;

  // Retrieve asset details (symbol and decimals) from the TokenizedAsset contract
  const assetData = await tokenizedAsset.assets(tokenId);
  const symbol = assetData[0];   // Asset symbol
  const decimals = assetData[1]; // Asset decimals

  // Define the burn amount.
  // You can pass this value via the environment variable BURN_AMOUNT (e.g., "0.0002")
  // Otherwise, default to "0.0002"
  const burnAmountInput = process.env.BURN_AMOUNT || "0.0014";
  const burnAmount = ethers.parseUnits(burnAmountInput, decimals);

  console.log(`Attempting to burn ${burnAmountInput} ${symbol} (raw: ${burnAmount.toString()}) from ${deployer.address}`);

  // Execute the burn transaction
  const tx = await tokenizedAsset.burn(deployer.address, tokenId, burnAmount);
  console.log("Burn transaction submitted. Hash:", tx.hash);

  // Wait for the transaction to be mined
  const receipt = await tx.wait();
  if (receipt.status === 0) {
    console.error("Burn transaction failed. Receipt:", receipt);
  } else {
    console.log("Burn transaction succeeded. Receipt:", receipt);
  }

  // Retrieve and display the updated balance
  const updatedBalance = await tokenizedAsset.balanceOf(deployer.address, tokenId);
  const formattedBalance = ethers.formatUnits(updatedBalance, decimals);
  console.log(`New balance for token ${symbol} (ID: ${tokenId}) is: ${formattedBalance}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error burning token:", error);
    process.exit(1);
  });
