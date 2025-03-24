const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

async function main() {
  // Convert symbols to NFT metadata format with a filter
  const symbolsFilter = ["QMCO",]; // Example filter
  const nftMetadata = convertSymbolsToNFTMetadata("assets.json", symbolsFilter);
  console.log("NFT Metadata: ", JSON.stringify(nftMetadata, null, 2));

  // Print unique classes
  printUniqueClasses("assets.json");
}

function convertSymbolsToNFTMetadata(filePath, symbolsFilter = []) {
  const data = fs.readFileSync(filePath, "utf8");
  const assets = JSON.parse(data);
  const filteredAssets = symbolsFilter.length > 0 
    ? assets.filter(asset => symbolsFilter.includes(asset.symbol)) 
    : assets;
  const nftMetadata = filteredAssets.map(asset => ({
    name: asset.symbol,
    description: `NFT representing the asset ${asset.symbol}`,
    image: `https://example.com/images/${asset.symbol}.png`,
    attributes: Object.keys(asset).map(key => ({
      trait_type: key,
      value: asset[key]
    }))
  }));
  return nftMetadata;
}

function printUniqueClasses(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const assets = JSON.parse(data);
  const uniqueClasses = [...new Set(assets.map(asset => asset.class))];
  console.log("Unique Classes: ", uniqueClasses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });