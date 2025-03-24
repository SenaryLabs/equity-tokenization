// scripts/sendMintRequest.js
const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");
const mintSource = fs.readFileSync("./functions/sources/alpacaBuy.js", "utf8");
const {
  getStockBidAsk,
  getCryptoBidAsk,
  getAlpacaAssets,
  symbolToPair,
} = require("./alpaca.js");

async function main() {
  const orderManagerAddress = process.env.ORDER_MANAGER_ADDRESS;
  const tokenizedAssetAddress = process.env.TOKENIZED_ASSET_ADDRESS;
  console.log("Order Manager Address: ", orderManagerAddress);
  // Attach to the deployed EquityTokenization contract
  const OrderManager = await ethers.getContractFactory("OrderManager");
  const orderManager = await OrderManager.attach(orderManagerAddress);
  const prefix = orderManagerAddress.slice(-4);

  const symbol = "BTCUSD"; // Asset symbol
  const bidask = await getCryptoBidAsk(symbolToPair(symbol));
  console.log("Bid Ask", bidask.ask);

  //const quantity = ethers.parseUnits(".00012", 18); // Quantity in 18 decimals (e.g., for BTC) 0.0001197
  //const price = ethers.parseUnits(bidask.ask.toString(), 6); // Price in USDC with 6 decimals 1,000,000.0 10,000000.0

  //const symbol = "AMOD";
  //const bidask = await getStockBidAsk(symbol);

  console.log("Bid Ask", bidask);

  const quantity = ethers.parseUnits("0.0002", 18); // Quantity in 18 decimals (e.g., for BTC) 0.0001197
  const price = ethers.parseUnits(bidask.bid.toString(), 6); // Price in USDC with 6 decimals 1,000,000.0 10,000000.0

  try {
    console.log(
      `Preparing to send mint request for ${ethers.formatUnits(
        quantity.toString(),
        18
      )} ${symbol} at price ${ethers.formatUnits(price.toString(), 6)}...`
    );

    const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
    const tokenizedAsset = await TokenizedAsset.attach(
      tokenizedAssetAddress
    );
    const tokenId = await tokenizedAsset.symbolToTokenId(symbol);
    console.log(`Token ID: ${tokenId.toString()}`);

    const collateralRequired = await orderManager.calculateUSDAmount(
      price,
      quantity,
      0
    );

    console.log(
      `Required collateral: ${ethers.formatUnits(
        collateralRequired.toString(),
        6
      )} USDC.`
    );

    console.log("Sending mint", price);
    // Execute the mint request transaction
    const [deployer] = await ethers.getSigners();

    const tx = await orderManager
      .connect(deployer)
      .sendOrderRequest(symbol, quantity, price, mintSource, prefix);

    console.log("Transaction submitted. Hash:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      console.error("Transaction failed. Receipt:", receipt);
    } else {
      console.log("Transaction succeeded. Receipt:", receipt);
    }

    // End the script
  } catch (error) {
    console.error("Transaction execution failed", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
