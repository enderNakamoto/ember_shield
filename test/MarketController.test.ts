import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  MockERC20,
  MarketController,
  MarketFactory
} from "../typechain-types";

describe("MarketController State Transitions", function () {
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let mockERC20: MockERC20;
  let marketController: MarketController;
  let marketFactory: MarketFactory;
  let marketId: bigint;
  let startTime: number;
  let endTime: number;

  // Test coordinates (Tokyo)
  const LATITUDE = Math.floor(35.6762 * 1000000);  // 35.6762°N
  const LONGITUDE = Math.floor(139.6503 * 1000000); // 139.6503°E

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
  });

  describe("Market State Transitions", function () {
    it("Should start in Open state", async function () {
      expect(await marketController.getMarketState(marketId)).to.equal(1); // Open
    });

    it("Should transition from Open to Locked", async function () {
      await time.increaseTo(startTime + 86400); // 1 day after start
      await marketController.lockMarket(marketId);
      expect(await marketController.getMarketState(marketId)).to.equal(2); // Locked
    });

    it("Should not allow locking before start time", async function () {
      await expect(
        marketController.lockMarket(marketId)
      ).to.be.revertedWithCustomError(marketController, "EventNotStartedYet");
    });

    it("Should not allow locking after end time", async function () {
      await time.increaseTo(endTime + 1);
      await expect(
        marketController.lockMarket(marketId)
      ).to.be.revertedWithCustomError(marketController, "EventAlreadyEnded");
    });

    it("Should transition from Locked to Liquidated using test function", async function () {
      await time.increaseTo(startTime + 86400); // 1 day after start
      await marketController.lockMarket(marketId);
      
      await marketController.test_liquidateMarket(marketId);
      
      expect(await marketController.getMarketState(marketId)).to.equal(4); // Liquidated
      const [hasLiquidated, liquidationTime] = await marketController.getLiquidationState(marketId);
      expect(hasLiquidated).to.be.true;
      expect(liquidationTime).to.be.gt(0);
    });

    it("Should transition from Locked to Matured using test function", async function () {
      await time.increaseTo(startTime + 86400); // 1 day after start
      await marketController.lockMarket(marketId);
      
      await time.increaseTo(endTime + 1); // After event end
      await marketController.test_matureMarket(marketId);
      
      expect(await marketController.getMarketState(marketId)).to.equal(3); // Matured
    });

    it("Should not allow liquidation before market is locked", async function () {
      await expect(
        marketController.test_liquidateMarket(marketId)
      ).to.be.revertedWith("Market must be locked");
    });

    it("Should not allow liquidation after event end time", async function () {
      await time.increaseTo(startTime + 86400);
      await marketController.lockMarket(marketId);
      await time.increaseTo(endTime + 1);
      
      await expect(
        marketController.test_liquidateMarket(marketId)
      ).to.be.revertedWith("Event ended");
    });

    it("Should not allow maturation before event end time", async function () {
      await time.increaseTo(startTime + 86400);
      await marketController.lockMarket(marketId);

      await expect(
        marketController.test_matureMarket(marketId)
      ).to.be.revertedWith("Event not ended");
    });

    it("Should not allow maturation of already liquidated market", async function () {
      await time.increaseTo(startTime + 86400);
      await marketController.lockMarket(marketId);
      await marketController.test_liquidateMarket(marketId);
      
      await time.increaseTo(endTime + 1);
      await expect(
        marketController.test_matureMarket(marketId)
      ).to.be.revertedWith("Market must be locked");
    });

    it("Should not allow double liquidation", async function () {
      await time.increaseTo(startTime + 86400);
      await marketController.lockMarket(marketId);
      await marketController.test_liquidateMarket(marketId);
      
      await expect(
        marketController.test_liquidateMarket(marketId)
      ).to.be.revertedWith("Market must be locked");
    });
  });
}); 