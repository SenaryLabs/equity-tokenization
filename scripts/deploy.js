// scripts/deploy.js
const { ethers, network } = require("hardhat");
require("dotenv").config();
const fs = require("fs");
// Custom implementation of formatBytes32String
function formatBytes32String(text) {
  if (text.length > 32) {
    throw new Error("String must be less than 32 bytes");
  }
  const buffer = Buffer.alloc(32);
  buffer.write(text);
  return "0x" + buffer.toString("hex");
}

async function main() {
  console.log(`Deploying contracts to network: ${network.name}`);

  // Parameters for the constructor
  const functionsRouter = process.env.FUNCTIONS_ROUTER;
  const donID = formatBytes32String(process.env.DON_ID);
  const subId = process.env.SUB_ID;
  const collateralToken = process.env.COLLATERAL_TOKEN_ADDRESS;
  const secretVersion = process.env.SECRET_VERSION;
  const secretSlot = process.env.SECRET_SLOT;
  const tokenizedAssetAddress = process.env.TOKENIZED_ASSET_ADDRESS;

  const missingVars = [];

  if (!functionsRouter) missingVars.push("FUNCTIONS_ROUTER");
  if (!donID) missingVars.push("DON_ID");
  if (!subId) missingVars.push("SUBSCRIPTION_ID");
  if (!collateralToken) missingVars.push("COLLATERAL_TOKEN");
  if (!secretVersion) missingVars.push("SECRET_VERSION");
  if (!secretSlot) missingVars.push("SECRET_SLOT");

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
  console.log("Deploying OrderManager contract...");

  // Deploy the contract
  const OrderManager = await ethers.getContractFactory("OrderManager");
  const orderManager = await OrderManager.deploy(
    functionsRouter,
    donID,
    subId,
    collateralToken,
    tokenizedAssetAddress,
    secretVersion,
    secretSlot
  );

  await orderManager.waitForDeployment();

  console.log("OrderManager deployed to:", orderManager.target);

  // Verify the contract on Etherscan (if applicable)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Verifying contract on Etherscan...");
    await orderManager.deploymentTransaction().wait(5);
    try {
      await hre.run("verify:verify", {
        address: orderManager.target,
        constructorArguments: [
          functionsRouter,
          donID,
          subId,
          collateralToken,
          tokenizedAssetAddress,
          secretVersion,
          secretSlot,
        ],
      });
      console.log("Contract verified successfully.");
    } catch (error) {
      console.error("Etherscan verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
