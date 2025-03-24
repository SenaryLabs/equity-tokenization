// scripts/asset.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the deployed contract address from environment or hard-code it if available
  const orderManagerAddress = process.env.ORDER_MANAGER_ADDRESS;

  console.log("Equity Tokenization Address: ", orderManagerAddress);

  try {
    // Attach to the deployed contract
    const OrderManager = await ethers.getContractFactory("OrderManager");
    const orderManager = await OrderManager.attach(orderManagerAddress);

    // Get the deployer's signer
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    // Get the collateral token and calculate required collateral 100,000,000
    const collateralTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;

    await checkAllowance(
      collateralTokenAddress,
      orderManagerAddress,
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
