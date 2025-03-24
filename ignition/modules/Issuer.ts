import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

function formatBytes32String(text) {
  if (text.length > 32) {
    throw new Error("String must be less than 32 bytes");
  }
  const buffer = Buffer.alloc(32);
  buffer.write(text);
  return "0x" + buffer.toString("hex");
}

const IssuerModule = buildModule("IssuerModule", (m) => {
  console.log("IssuerModule");
  console.log("don-id",m);
  // Parameters
  const functionsRouter = m.getParameter("functionsRouter");
  const donId = formatBytes32String(m.getParameter("donId"));
  const subscriptionId = m.getParameter("subscriptionId");

  // Deploy IssuanceRequest Contract
  const issuer = m.contract("Issuer", [
    functionsRouter,
    donId,
    subscriptionId,
  ]);

  // Return deployed contracts
  return { issuer };
});

export default IssuerModule;
