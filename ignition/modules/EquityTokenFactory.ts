import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EquityTokenFactoryModule = buildModule(
  "EquityTokenFactoryModule",
  (m) => {
    // Parameter for factory ownership
    const factoryOwner = m.getParameter("factoryOwner");

    // Deploy EquityToken implementation
    const equityTokenImplementation = m.contract("EquityToken", []);

    // Deploy EquityTokenFactory referencing the implementation
    const equityTokenFactory = m.contract("EquityTokenFactory", [
      equityTokenImplementation,
      factoryOwner,
    ]);

    // Export deployed contracts
    return { equityTokenImplementation, equityTokenFactory };
  }
);

export default EquityTokenFactoryModule;
