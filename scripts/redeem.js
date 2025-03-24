// scripts/sendRedeemRequest.js
const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");
// Read the inline JavaScript source for Chainlink Functions (redeem logic)
const redeemSource = fs.readFileSync("./functions/sources/alpacaSell.js", "utf8");
const {
  getStockBidAsk,
  getCryptoBidAsk,
  getAlpacaAssets,
  symbolToPair,
} = require("./alpaca.js");

async function main() {
  const orderManagerAddress = process.env.ORDER_MANAGER_ADDRESS;
  console.log("Order Manager Address: ", orderManagerAddress);
  // Attach to the deployed OrderManager contract
  const OrderManager = await ethers.getContractFactory("OrderManager");
  const orderManager = await OrderManager.attach(orderManagerAddress);
  const prefix = orderManagerAddress.slice(-4);

  const symbol = "BTCUSD"; // Asset symbol
  // Get bid/ask data; for a redeem order, the bid price is usually used.
  const bidask = await getCryptoBidAsk(symbolToPair(symbol));
  console.log("Bid Ask", bidask);

  // For example, redeem 0.0002 BTC (in 18 decimals representation)
  const quantity = ethers.parseUnits("0.0002", 18);
  // For selling, we might use the bid price (in USDC with 6 decimals)
  const price = ethers.parseUnits(bidask.bid.toString(), 6);

  try {
    console.log(
      `Preparing to send redeem request for ${ethers.formatUnits(
        quantity,
        18
      )} ${symbol} at price ${ethers.formatUnits(price, 6)}...`
    );

    console.log("Sending redeem request with price", price);
    // Execute the redeem request transaction
    const [deployer] = await ethers.getSigners();
    const tx = await orderManager
      .connect(deployer)
      .sendRedeemRequest(symbol, quantity, price, redeemSource, prefix);

    console.log("Transaction submitted. Hash:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      console.error("Transaction failed. Receipt:", receipt);
    } else {
      console.log("Transaction succeeded. Receipt:", receipt);
    }
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
