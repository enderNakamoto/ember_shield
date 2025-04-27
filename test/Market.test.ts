import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

describe("Market System", function () {
  let marketController: Contract;
  let marketFactory: Contract;
  let mockERC20: Contract;
  let owner: any;
  let user1: any;
  let user2: any;

  // Using string literals for amounts to avoid BigNumber issues
  const INITIAL_SUPPLY = "1000000000000000000000000"; // 1M tokens
  const DEPOSIT_AMOUNT = "1000000000000000000000"; // 1000 tokens
  const TRIGGER_PRICE = "100000000000000000000"; // 100 tokens
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await (await MockERC20.deploy("Mock Token", "MTK", INITIAL_SUPPLY)).waitForDeployment();

    // Deploy MarketController
    const MarketController = await ethers.getContractFactory("MarketController");
    marketController = await (await MarketController.deploy()).waitForDeployment();

    // Deploy MarketFactory
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await (await MarketFactory.deploy(
      await marketController.getAddress(),
      await mockERC20.getAddress()
    )).waitForDeployment();

    // Set MarketFactory in Controller
    await marketController.setMarketFactory(await marketFactory.getAddress());

    // Transfer tokens to users
    await mockERC20.transfer(user1.address, DEPOSIT_AMOUNT);
    await mockERC20.transfer(user2.address, DEPOSIT_AMOUNT);
  });

  describe("Market Creation", function () {
    it("Should create a new market with correct parameters", async function () {
      const now = await time.latest();
      const startTime = now + 3600; // Start in 1 hour
      const endTime = startTime + 7200; // End 2 hours after start

      const tx = await marketController.createMarket(
        startTime,
        endTime,
        TRIGGER_PRICE
      );
      const receipt = await tx.wait();

      // Find MarketCreated event
      const marketCreatedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === "MarketCreated"
      );
      expect(marketCreatedEvent).to.not.be.undefined;

      const marketId = marketCreatedEvent.args[0]; // First argument is marketId
      const [riskVault, hedgeVault] = await marketFactory.getVaults(marketId);

      expect(riskVault).to.not.equal(ZERO_ADDRESS);
      expect(hedgeVault).to.not.equal(ZERO_ADDRESS);
    });

    it("Should not allow creation with invalid time parameters", async function () {
      const now = await time.latest();
      const startTime = now - 3600; // Start 1 hour ago
      const endTime = now + 3600; // End in 1 hour

      await expect(
        marketController.createMarket(startTime, endTime, TRIGGER_PRICE)
      ).to.be.revertedWithCustomError(marketFactory, "InvalidTimeParameters");
    });
  });

  describe("Market Operations", function () {
    let marketId: number;
    let riskVault: Contract;
    let hedgeVault: Contract;
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const now = await time.latest();
      startTime = now + 3600;
      endTime = startTime + 7200;

      const tx = await marketController.createMarket(
        startTime,
        endTime,
        TRIGGER_PRICE
      );
      const receipt = await tx.wait();
      const marketCreatedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === "MarketCreated"
      );
      marketId = marketCreatedEvent.args[0];

      const [riskAddress, hedgeAddress] = await marketFactory.getVaults(marketId);
      riskVault = await ethers.getContractAt("RiskVault", riskAddress);
      hedgeVault = await ethers.getContractAt("HedgeVault", hedgeAddress);

      // Approve vaults to spend tokens
      await mockERC20.connect(user1)["approve(address,uint256)"](riskAddress, DEPOSIT_AMOUNT);
      await mockERC20.connect(user2)["approve(address,uint256)"](hedgeAddress, DEPOSIT_AMOUNT);
    });

    it("Should allow deposits when market is open", async function () {
      await riskVault.connect(user1)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user1.address);
      await hedgeVault.connect(user2)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user2.address);

      expect(await riskVault.balanceOf(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await hedgeVault.balanceOf(user2.address)).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should lock market and prevent deposits", async function () {
      await time.increaseTo(startTime);
      await marketController.lockMarket(marketId);

      await expect(
        riskVault.connect(user1)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user1.address)
      ).to.be.revertedWithCustomError(marketController, "DepositNotAllowed");
    });

    it("Should handle liquidation correctly", async function () {
      // Deposit into both vaults
      await riskVault.connect(user1)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user1.address);
      await hedgeVault.connect(user2)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user2.address);

      // Lock market
      await time.increaseTo(startTime);
      await marketController.lockMarket(marketId);

      // Trigger liquidation
      const priceBeforeTrigger = BigInt(TRIGGER_PRICE) - 1n;
      await marketController.processOracleData(
        marketId,
        priceBeforeTrigger.toString(),
        await time.latest()
      );

      // Check that assets were transferred to hedge vault
      expect(await mockERC20.balanceOf(await riskVault.getAddress())).to.equal(0);
      expect(await mockERC20.balanceOf(await hedgeVault.getAddress())).to.equal(
        (BigInt(DEPOSIT_AMOUNT) * 2n).toString()
      );
    });

    it("Should handle maturation correctly", async function () {
      // Deposit into both vaults
      await riskVault.connect(user1)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user1.address);
      await hedgeVault.connect(user2)["deposit(uint256,address)"](DEPOSIT_AMOUNT, user2.address);

      // Lock market
      await time.increaseTo(startTime);
      await marketController.lockMarket(marketId);

      // Move time past end time
      await time.increaseTo(endTime + 1);

      // Trigger maturation
      await marketController.matureMarket(marketId);

      // Check that assets were transferred to risk vault
      expect(await mockERC20.balanceOf(await hedgeVault.getAddress())).to.equal(0);
      expect(await mockERC20.balanceOf(await riskVault.getAddress())).to.equal(
        (BigInt(DEPOSIT_AMOUNT) * 2n).toString()
      );
    });
  });
}); 