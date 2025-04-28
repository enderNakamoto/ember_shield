import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  MockERC20,
  MarketController,
  MarketFactory,
  RiskVault,
  HedgeVault
} from "../typechain-types";

describe("Market Vaults Operations", function () {
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let mockERC20: MockERC20;
  let marketController: MarketController;
  let marketFactory: MarketFactory;
  let riskVault: RiskVault;
  let hedgeVault: HedgeVault;
  let marketId: bigint;
  let startTime: number;
  let endTime: number;

  // Test coordinates (Tokyo)
  const LATITUDE = Math.floor(35.6762 * 1000000);  // 35.6762°N
  const LONGITUDE = Math.floor(139.6503 * 1000000); // 139.6503°E

  // Test amounts
  const INITIAL_MINT = ethers.parseUnits("1000000", 18); // 1M tokens
  const DEPOSIT_AMOUNT = ethers.parseUnits("10000", 18); // 10K tokens

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20Factory.deploy("Mock USDC", "mUSDC") as MockERC20;
    await mockERC20.waitForDeployment();

    // Deploy MarketController
    const MarketControllerFactory = await ethers.getContractFactory("MarketController");
    marketController = await MarketControllerFactory.deploy() as MarketController;
    await marketController.waitForDeployment();

    // Deploy MarketFactory
    const MarketFactoryFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactoryFactory.deploy(
      await marketController.getAddress(),
      await mockERC20.getAddress()
    ) as MarketFactory;
    await marketFactory.waitForDeployment();

    // Link MarketController to MarketFactory
    await marketController.setMarketFactory(await marketFactory.getAddress());

    // Mint tokens to users
    await mockERC20.mint(owner.address, INITIAL_MINT);
    await mockERC20.mint(user1.address, INITIAL_MINT);
    await mockERC20.mint(user2.address, INITIAL_MINT);

    // Set up market times
    const now = await time.latest();
    startTime = now + (2 * 86400); // Start in 2 days
    endTime = now + (30 * 86400); // End in 30 days

    // Create a market
    const tx = await marketController.createMarket(
      startTime,
      endTime,
      LATITUDE,
      LONGITUDE
    );
    const receipt = await tx.wait();

    // Get market ID from event
    const event = (receipt?.logs.find(
      (log: any) => log.fragment?.name === "MarketStateChanged"
    ) as any);
    marketId = event?.args[0];

    // Get vault addresses
    const [riskVaultAddr, hedgeVaultAddr] = await marketController.getMarketVaults(marketId);

    // Get vault contracts
    riskVault = await ethers.getContractAt("RiskVault", riskVaultAddr) as RiskVault;
    hedgeVault = await ethers.getContractAt("HedgeVault", hedgeVaultAddr) as HedgeVault;
  });

  describe("Vault Setup", function () {
    it("Should have correct initial state", async function () {
      expect(await riskVault.asset()).to.equal(await mockERC20.getAddress());
      expect(await hedgeVault.asset()).to.equal(await mockERC20.getAddress());
      expect(await riskVault.marketId()).to.equal(marketId);
      expect(await hedgeVault.marketId()).to.equal(marketId);
      expect(await riskVault.getCounterpartVault()).to.equal(await hedgeVault.getAddress());
      expect(await hedgeVault.getCounterpartVault()).to.equal(await riskVault.getAddress());
    });
  });

  describe("Deposits", function () {
    beforeEach(async function () {
      // Approve vaults to spend tokens
      await mockERC20.connect(user1).approve(await riskVault.getAddress(), DEPOSIT_AMOUNT);
      await mockERC20.connect(user2).approve(await hedgeVault.getAddress(), DEPOSIT_AMOUNT);
    });

    it("Should allow deposits to risk vault", async function () {
      // Check initial balances
      expect(await mockERC20.balanceOf(user1.address)).to.equal(INITIAL_MINT);
      expect(await riskVault.totalAssets()).to.equal(0);

      // Deposit to risk vault
      await riskVault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

      // Check final balances
      expect(await mockERC20.balanceOf(user1.address)).to.equal(INITIAL_MINT - DEPOSIT_AMOUNT);
      expect(await riskVault.totalAssets()).to.equal(DEPOSIT_AMOUNT);
      expect(await riskVault.balanceOf(user1.address)).to.be.gt(0);
    });

    it("Should allow deposits to hedge vault", async function () {
      // Check initial balances
      expect(await mockERC20.balanceOf(user2.address)).to.equal(INITIAL_MINT);
      expect(await hedgeVault.totalAssets()).to.equal(0);

      // Deposit to hedge vault
      await hedgeVault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address);

      // Check final balances
      expect(await mockERC20.balanceOf(user2.address)).to.equal(INITIAL_MINT - DEPOSIT_AMOUNT);
      expect(await hedgeVault.totalAssets()).to.equal(DEPOSIT_AMOUNT);
      expect(await hedgeVault.balanceOf(user2.address)).to.be.gt(0);
    });

    it("Should not allow deposits after market is locked", async function () {
      // Lock market
      await time.increaseTo(startTime + 86400); // 1 day after start
      await marketController.lockMarket(marketId);

      // Try to deposit to risk vault
      await expect(
        riskVault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address)
      ).to.be.revertedWithCustomError(marketController, "DepositNotAllowed");

      // Try to deposit to hedge vault
      await expect(
        hedgeVault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address)
      ).to.be.revertedWithCustomError(marketController, "DepositNotAllowed");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Approve and deposit to vaults
      await mockERC20.connect(user1).approve(await riskVault.getAddress(), DEPOSIT_AMOUNT);
      await mockERC20.connect(user2).approve(await hedgeVault.getAddress(), DEPOSIT_AMOUNT);
      await riskVault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);
      await hedgeVault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address);
    });

    it("Should allow withdrawals from risk vault when market is open", async function () {
      const shareBalance = await riskVault.balanceOf(user1.address);
      await riskVault.connect(user1).withdraw(DEPOSIT_AMOUNT, user1.address, user1.address);

      expect(await mockERC20.balanceOf(user1.address)).to.equal(INITIAL_MINT);
      expect(await riskVault.totalAssets()).to.equal(0);
      expect(await riskVault.balanceOf(user1.address)).to.equal(0);
    });

    it("Should allow withdrawals from hedge vault when market is open", async function () {
      const shareBalance = await hedgeVault.balanceOf(user2.address);
      await hedgeVault.connect(user2).withdraw(DEPOSIT_AMOUNT, user2.address, user2.address);

      expect(await mockERC20.balanceOf(user2.address)).to.equal(INITIAL_MINT);
      expect(await hedgeVault.totalAssets()).to.equal(0);
      expect(await hedgeVault.balanceOf(user2.address)).to.equal(0);
    });

    it("Should not allow withdrawals when market is locked", async function () {
      // Lock market
      await time.increaseTo(startTime + 86400); // 1 day after start
      await marketController.lockMarket(marketId);

      // Try to withdraw from risk vault
      await expect(
        riskVault.connect(user1).withdraw(DEPOSIT_AMOUNT, user1.address, user1.address)
      ).to.be.revertedWithCustomError(marketController, "WithdrawNotAllowed");

      // Try to withdraw from hedge vault
      await expect(
        hedgeVault.connect(user2).withdraw(DEPOSIT_AMOUNT, user2.address, user2.address)
      ).to.be.revertedWithCustomError(marketController, "WithdrawNotAllowed");
    });
  });
}); 