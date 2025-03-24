const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  
  describe("EquityTokenFactory & EquityToken", function () {
  
    async function deployFactoryFixture() {
      const [owner, issuer, custodian, investor, otherAccount] = await ethers.getSigners();
  
      const EquityToken = await ethers.getContractFactory("EquityToken");
      const equityTokenImplementation = await EquityToken.deploy();
  
      const EquityTokenFactory = await ethers.getContractFactory("EquityTokenFactory");
      const factory = await EquityTokenFactory.deploy(equityTokenImplementation.target, owner.address);
  
      return { factory, equityTokenImplementation, owner, issuer, custodian, investor, otherAccount };
    }
  
    describe("Deployment", function () {
      it("Should set correct implementation address", async function () {
        const { factory, equityTokenImplementation } = await loadFixture(deployFactoryFixture);
  
        expect(await factory.implementation()).to.equal(equityTokenImplementation.target);
      });
  
      it("Should deploy EquityToken correctly through factory", async function () {
        const { factory, issuer } = await loadFixture(deployFactoryFixture);
  
        const tx = await factory.createEquityToken("NVIDIA Token", "NVDA", 18, issuer.address);
        const receipt = await tx.wait();
  
        const event = receipt.logs.find(log => log.fragment.name === "EquityTokenCreated");
        expect(event).to.exist;
  
        const tokenAddress = event.args.tokenAddress;
        expect(tokenAddress).to.properAddress;
  
        const EquityToken = await ethers.getContractFactory("EquityToken");
        const token = EquityToken.attach(tokenAddress);
  
        expect(await token.name()).to.equal("NVIDIA Token");
        expect(await token.symbol()).to.equal("NVDA");
        expect(await token.decimals()).to.equal(18);
      });
    });
  
    describe("EquityToken Functionality", function () {
      async function deployTokenFixture() {
        const fixture = await loadFixture(deployFactoryFixture);
        const { factory, issuer, custodian } = fixture;
  
        const tx = await factory.createEquityToken("NVIDIA Token", "NVDA", 18, issuer.address);
        const receipt = await tx.wait();
        const tokenAddress = receipt.logs.find(log => log.fragment.name === "EquityTokenCreated").args.tokenAddress;
  
        const EquityToken = await ethers.getContractFactory("EquityToken");
        const token = EquityToken.attach(tokenAddress);
  
        return { token, issuer, custodian, ...fixture };
      }
  
      it("Should allow issuer to mint tokens", async function () {
        const { token, issuer, investor } = await loadFixture(deployTokenFixture);
  
        const mintAmount = ethers.parseUnits("100", 18);
        await expect(token.connect(issuer).mint(investor.address, mintAmount))
          .to.emit(token, "Transfer")
          .withArgs(ethers.ZeroAddress, investor.address, mintAmount);
  
        expect(await token.balanceOf(investor.address)).to.equal(mintAmount);
      });
  
      it("Should revert minting from non-issuer", async function () {
        const { token, otherAccount, investor } = await loadFixture(deployTokenFixture);
  
        await expect(token.connect(otherAccount).mint(investor.address, ethers.parseUnits("100", 18)))
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
      });
  
      it("Custodian should transfer tokens between accounts", async function () {
        const { token, issuer, custodian, investor, otherAccount } = await loadFixture(deployTokenFixture);
  
        const mintAmount = ethers.parseUnits("100", 18);
        await token.connect(issuer).mint(investor.address, mintAmount);
  
        const transferAmount = ethers.parseUnits("50", 18);
        await expect(token.connect(custodian).custodianTransfer(investor.address, otherAccount.address, transferAmount))
          .to.emit(token, "CustodianTransferred")
          .withArgs(custodian.address, investor.address, otherAccount.address, transferAmount);
  
        expect(await token.balanceOf(investor.address)).to.equal(ethers.parseUnits("50", 18));
        expect(await token.balanceOf(otherAccount.address)).to.equal(transferAmount);
      });
  
      it("Should pause and unpause correctly", async function () {
        const { token, issuer, investor } = await loadFixture(deployTokenFixture);
  
        await token.connect(issuer).pause();
        await expect(token.connect(issuer).mint(investor.address, 100))
          .to.be.revertedWith("Pausable: paused");
  
        await token.connect(issuer).unpause();
        await expect(token.connect(issuer).mint(investor.address, 100))
          .not.to.be.reverted;
      });
  
      it("Permit: Should allow gasless approvals (EIP-2612)", async function () {
        const { token, investor, otherAccount } = await loadFixture(deployTokenFixture);
        
        const amount = ethers.parseUnits("100", 18);
        const nonce = await token.nonces(investor.address);
        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
  
        const domain = {
          name: await token.name(),
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: token.target,
        };
  
        const types = {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        };
  
        const signature = await investor.signTypedData(domain, types, {
          owner: investor.address,
          spender: otherAccount.address,
          value: amount,
          nonce: nonce,
          deadline: deadline,
        });
  
        const { v, r, s } = ethers.Signature.from(signature);
  
        await expect(token.permit(investor.address, otherAccount.address, amount, deadline, v, r, s))
          .to.emit(token, "Approval")
          .withArgs(investor.address, otherAccount.address, amount);
  
        expect(await token.allowance(investor.address, otherAccount.address)).to.equal(amount);
      });
    });
  });
  