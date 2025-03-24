// scripts/deploy-and-addAsset.js
const { ethers, network, run } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log(`Deploying TokenizedAsset to network: ${network.name}`);

  // Deploy the TokenizedAsset contract.
  const TokenizedAsset = await ethers.getContractFactory("TokenizedAsset");
  const tokenizedAsset = await TokenizedAsset.deploy("https://storage.googleapis.com/gm-assets-metadata/{id}.json");
  await tokenizedAsset.waitForDeployment();
  console.log("TokenizedAsset deployed to:", tokenizedAsset.target);

  // Optionally verify the contract on Etherscan.
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Verifying contract on Etherscan...");
    // Wait for a few block confirmations to ensure the deployment transaction is mined.
    await tokenizedAsset.deploymentTransaction().wait(5);
    try {
      await run("verify:verify", {
        address: tokenizedAsset.target,
        constructorArguments: [baseURI],
      });
      console.log("Contract verified successfully.");
    } catch (error) {
      console.error("Etherscan verification failed:", error.message);
    }
  }

  // --- Now add an asset automatically after deployment ---
  // Example asset parameters:
  //   - symbol: "BTCUSD"
  //   - decimals: 18 (e.g., crypto assets often use 18 decimals)
  //   - initialSupply: 0 (starting supply, adjust as needed)
  const symbol = "BTCUSD";
  const decimals = 18;
  const initialSupply = 0;

  console.log(`Adding asset ${symbol} with ${decimals} decimals and initial supply ${initialSupply}...`);
  const tx = await tokenizedAsset.addAsset(symbol, decimals, initialSupply);
  console.log("Transaction submitted. Hash:", tx.hash);

  const receipt = await tx.wait();
  if (receipt.status === 0) {
    console.error("Asset addition transaction failed. Receipt:", receipt);
  } else {
    console.log(`Asset ${symbol} added successfully. Transaction confirmed: ${receipt.transactionHash}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment or asset addition failed:", error);
    process.exit(1);
  });
