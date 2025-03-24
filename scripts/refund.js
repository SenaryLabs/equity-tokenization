const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const equityTokenisationAddress = process.env.ORDER_MANAGER_ADDRESS;
  const usdcTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;

  // Attach to the deployed AssetManager contract
  const EquityTokenisation = await ethers.getContractFactory("OrderManager");
  const equityTokenization = await EquityTokenisation.attach(equityTokenisationAddress);

  // Attach to the USDC contract
  const USDC = await ethers.getContractAt("IERC20", usdcTokenAddress);

  // Get the connected wallet (default signer)
  const [deployer] = await ethers.getSigners();
  console.log(`Connected with address: ${deployer.address}`);

  // Get deployer's USDC balance before refund
  const balanceBefore = await USDC.balanceOf(deployer.address);
  console.log(
    `Deployer's USDC balance before refund: ${ethers.formatUnits(
      balanceBefore,
      6
    )} USDC`
  );

  // Call the refund function
  console.log("Initiating refund...");
  const refundTx = await equityTokenization
    .connect(deployer)
    .refund(usdcTokenAddress);
  console.log("Refund transaction hash:", refundTx.hash);

  // Wait for the transaction to be mined
  const receipt = await refundTx.wait();
  if (receipt.status === 0) {
    console.error("Refund transaction failed. Receipt:", receipt);
  } else {
    console.log("Refund transaction succeeded. Receipt:", receipt);
  }

  // Get deployer's USDC balance after refund
  const balanceAfter = await USDC.balanceOf(deployer.address);
  console.log(
    `Deployer's USDC balance after refund: ${ethers.formatUnits(
      balanceAfter,
      6
    )} USDC`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
