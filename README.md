# Fusion Finance: Tokenized Equity Concept

Fusion Finance is a protocol that tokenizes equities using blockchain as a messaging system for trade instructions, with settlement occurring on-chain. It bridges traditional and blockchain finance, offering a scalable, compliant solution for equity tokenization.

**Key Benefits:** Tapping into equities deep liquidity, ensures  and leverages smart contract automation for equity trading and ownership management.

## Technical Notes

**Functionality:**

* Clients initiate orders direct smart contract calls, with access controls restricting token creation to authorized parties.
* Instruction tokens trigger custodian actions, while security tokens represents ownership updates.

**Order Execution**

**Buying:**

1.  Client creates an order instruction and sends it to the broker-dealer.
2.  Broker-dealer executes ther buy order the asset off-chain and upon sucessful trade confirmation the protocol mints a security token representing the client's ownership.

**Selling:**

1.  Client issues an instruction token for selling, sent to the to broker-dealer.
2.  Broker-deal executes the sell order of the asset off-chain and the protocol burns the equivelent of the shares in the security token.

**Transferring:**

1.  Clients transfer security tokens peer-to-peer.
2.  Custodian updates off-chain ownership records accordingly.

**Broker-Dealer Integration**

Chainlink Functions, powered by Decentralized Oracle Networks (DONs), receive instructions from the Order Manager and extract key order details; such as the asset symbol, quantity, and price. These functions then make HTTP requests to the Alpaca API, which executes the trades on the exchange.

This process is synchronous and somewhat atomic: the `fulfillRequest` callback ensures the order is successfully filled before moving forward with minting.

**Benefits of Chainlink Functions:**

   - Trust-minimized and tamper-proof: Offers a secure and reliable setup for trade execution.

   - On-chain traceability: Provides transparency by recording function requests and responses.


**Synchronization Mechanisms**

* **Custodian Updates:** Maintain mappings between security tokens and off-chain assets, updated via blockchain events.
* **Smart Contract Confirmations:** Custodians confirm actions on-chain to ensure consistency.
* **Periodic Audits:** Regular reconciliations is required to verify on-chain and off-chain alignment.
* **Verification:** Security tokens embed off-chain reference to `client_order_id` for tracebility.

**Smart Contract Implementation**

The `OrderManager.sol` is a Chainlink Consumer which serves as the central point for initiating and managing equity trade ordersl. Its primary responsibility is to facilitate the submission of order details to an off-chain broker-dealer. 

The process begins when a user submits a buy/sell shares for a listed stock (e.g. NVDA). The request includes quantity and tokenId representing ticker symbol of the asset being traded. The `OrderManager` has the routes the order details via Chainlink Consumer function. The Chainlink Function then sends instructions to the broker-dealer's API with order payload. The broker executing the trade, and the subsequent updates to the user's tokenized equity holdings, which would be managed by the Fusion Equity protocol.

The `TokenizedAsset.sol` contract is responsible for representing equity ownership on the blockchain within the Fusion Finance protocol. Utilizing the ERC-1155 multi-token standard, it allows for the creation and management of various tokenized assets, each representing a specific equity. After a successful buy order is executed by the broker-dealer, the tokenization process is typically triggered by a trusted Custodian. This involves first registering the specific equity (if not already done) using the `addAsset` function, which assigns a unique token ID and stores relevant asset details. Subsequently, the Custodian calls the `mint` function, crediting the buyer's address with the corresponding number of ERC-1155 tokens that represent their newly acquired equity.

When a user sells their tokenized equity, the Custodian initiates the burning of these tokens using the `burn` function, reflecting the off-chain sale. This controlled minting and burning process, managed by the Custodian, ensures that the on-chain representation of equity ownership aligns with the real-world trading activity. The ERC-1155 standard provides an efficient way to manage multiple different equity tokens within a single contract, streamlining the tokenization and ownership tracking aspects of the Fusion Equity protocol.

## Getting Started

### Prerequisites

Before getting started, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Hardhat](https://hardhat.org/)
- A wallet with Sepolia testnet ETH for gas fees

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/SenaryLabs/equity-tokenization.git
   cd equity-tokenization
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Create a `.env` file by copying `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:

   - Add your private key (`PRIVATE_KEY`) for deploying contracts.
   - Add your API keys for Etherscan and Alpaca.
   - Update contract addresses and other parameters as needed.

## Compile Contracts

Compile the smart contracts using Hardhat:

```bash
npx hardhat compile
```

## Deploy Contracts

1. Deploy the `TokenizedAsset` contract:

   ```bash
   npx hardhat run scripts/deploy-tokenizedasset.js --network base-sepolia
   ```

   This script will deploy the `TokenizedAsset` contract and optionally add an asset.

2. Deploy the `OrderManager` contract:

   ```bash
   npx hardhat run scripts/deploy.js --network base-sepolia
   ```

   Ensure the `.env` file contains the required parameters for deployment.

## Run Scripts

The project includes several scripts for interacting with the deployed contracts. Below are some examples:

### Mint Tokens

Mint tokens for a specific asset:

```bash
npx hardhat run scripts/mint.js --network base-sepolia
```

### Redeem Tokens

Redeem tokens for an asset:

```bash
npx hardhat run scripts/redeem.js --network base-sepolia
```

### Check Balance

Check the balance of a specific token:

```bash
npx hardhat run scripts/balance.js --network base-sepolia
```

### Add Asset

Add a new asset to the `TokenizedAsset` contract:

```bash
npx hardhat run scripts/asset.js --network base-sepolia
```

### Burn Tokens

Burn tokens for a specific asset:

```bash
npx hardhat run scripts/burn.js --network base-sepolia
```

## Testing

Run the tests using Hardhat:

```bash
npx hardhat test
```

## Verify Contracts

Verify the deployed contracts on Etherscan:

```bash
npx hardhat verify --network base-sepolia <contract-address> <constructor-arguments>
```

## Additional Notes

- Ensure your `.env` file is properly configured before running any scripts.
- Use the Sepolia testnet for testing and deployment.
- Refer to the `package.json` file for additional scripts and commands.



## License

This project is licensed under the [MIT License](LICENSE).