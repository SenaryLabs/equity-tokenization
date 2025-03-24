// scripts/show-balance.js
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

  // Get the token ID to check; default to 0 if not provided in .env
  const tokenId = process.env.TOKEN_ID ? parseInt(process.env.TOKEN_ID) : 0;

  // Retrieve the ERC1155 balance of the token for the deployer
  const balance = await tokenizedAsset.balanceOf(deployer.address, tokenId);

  // Retrieve asset details from the TokenizedAsset contract
  // The getter returns a tuple, so we destructure the values.
  // Here we extract symbol and decimals.
  const assetData = await tokenizedAsset.assets(tokenId);
  const symbol = assetData[0];    // asset symbol
  const decimals = assetData[1];  // asset decimals

  // Format the balance using the asset's decimals
  const formattedBalance = ethers.formatUnits(balance, decimals);
  console.log(`Balance for token ${symbol} (ID: ${tokenId}) is: ${formattedBalance}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error reading balance:", error);
    process.exit(1);
  });
