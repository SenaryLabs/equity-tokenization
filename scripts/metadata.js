// scripts/verify-metadata.js
const { ethers } = require("hardhat");
require("dotenv").config();
const fetch = require("node-fetch");

async function main() {
  // Retrieve the deployed TokenizedAsset contract address from .env
  const tokenizedAssetAddress = process.env.TOKENIZED_ASSET_ADDRESS;
  if (!tokenizedAssetAddress) {
    throw new Error("Missing required environment variable: TOKENIZED_ASSET_ADDRESS");
  }

  // Attach to the deployed TokenizedAsset contract
  const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
  const tokenizedAsset = await TokenizedAsset.attach(tokenizedAssetAddress);

  // Get the token ID to verify; default to 0 if not provided in .env
  const tokenId = process.env.TOKEN_ID ? parseInt(process.env.TOKEN_ID) : 0;

  // Retrieve the metadata URI template from the contract by calling the ERC1155 uri() function
  let uriTemplate = await tokenizedAsset.uri(tokenId);
  console.log("URI template from contract:", uriTemplate);

  // The ERC1155 standard uses the "{id}" placeholder in the URI. Replace it with the token ID in hex format.
  // Convert tokenId to a 64-character hexadecimal string (padded with zeros)
  const tokenIdHex = tokenId.toString(16).padStart(64, "0");
  const metadataUrl = uriTemplate.replace("{id}", tokenIdHex);
  console.log("Resolved metadata URL:", metadataUrl);

  // Fetch the metadata from the URL
  const response = await fetch(metadataUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: HTTP ${response.status}`);
  }
  const metadata = await response.json();
  console.log("Metadata JSON:", metadata);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error verifying metadata:", error);
    process.exit(1);
  });
