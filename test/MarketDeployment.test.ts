import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  MockERC20,
  MarketController,
  MarketFactory
} from "../typechain-types";

describe("Market System Deployment and Creation", function () {
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let mockERC20: MockERC20;
  let marketController: MarketController;
  let marketFactory: MarketFactory;

  // Test coordinates (Tokyo)
  const LATITUDE = Math.floor(35.6762 * 1000000);  // 35.6762°N
  const LONGITUDE = Math.floor(139.6503 * 1000000); // 139.6503°E

  beforeEach(async function () {
    // Get signers
    [owner, user1] = await ethers.getSigners();

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

    // Mint some tokens to owner and user1
    const mintAmount = ethers.parseUnits("1000000", 18); // 1M tokens
    await mockERC20.mint(owner.address, mintAmount);
    await mockERC20.mint(user1.address, mintAmount);
  });

  describe("Contract Deployment", function () {
    it("Should deploy all contracts with correct initialization", async function () {
      // Check MockERC20 initialization
      expect(await mockERC20.name()).to.equal("Mock USDC");
      expect(await mockERC20.symbol()).to.equal("mUSDC");
      expect(await mockERC20.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000000", 18));

      // Check MarketFactory initialization
      expect(await marketFactory.getController()).to.equal(await marketController.getAddress());
      expect(await marketFactory.getAsset()).to.equal(await mockERC20.getAddress());

      // Check MarketController initialization
      expect(await marketController.getMarketFactory()).to.equal(await marketFactory.getAddress());
    });
  });

  describe("Market Creation", function () {
    it("Should create a market with valid parameters", async function () {
      const now = await time.latest();
      const eventStartTime = now + (2 * 86400); // Start in 2 days
      const eventEndTime = now + (30 * 86400); // End in 30 days

      // Create market
      const tx = await marketController.createMarket(
        eventStartTime,
        eventEndTime,
        LATITUDE,
        LONGITUDE
      );
      const receipt = await tx.wait();

      // Find MarketStateChanged event
      const event = (receipt?.logs.find(
        (log: any) => log.fragment?.name === "MarketStateChanged"
      ) as any);
      expect(event).to.not.be.undefined;

      const marketId = event?.args[0];
      expect(marketId).to.not.be.undefined;

      // Get market vaults
      const [riskVault, hedgeVault] = await marketController.getMarketVaults(marketId);
      expect(riskVault).to.be.properAddress;
      expect(hedgeVault).to.be.properAddress;

      // Check market state
      expect(await marketController.getMarketState(marketId)).to.equal(1); // Open state
      expect(await marketController.marketExists(marketId)).to.be.true;
    });

    it("Should fail to create market with invalid time parameters", async function () {
      const now = await time.latest();
      const invalidStartTime = now - 86400; // Start time in the past
      const eventEndTime = now + (30 * 86400);

      await expect(
        marketController.createMarket(
          invalidStartTime,
          eventEndTime,
          LATITUDE,
          LONGITUDE
        )
      ).to.be.revertedWithCustomError(marketFactory, "InvalidTimeParameters");
    });

    it("Should fail to create market with invalid coordinates", async function () {
      const now = await time.latest();
      const eventStartTime = now + (2 * 86400);
      const eventEndTime = now + (30 * 86400);

      await expect(
        marketController.createMarket(
          eventStartTime,
          eventEndTime,
          0, // Invalid latitude
          LONGITUDE
        )
      ).to.be.revertedWithCustomError(marketController, "InvalidCoordinates");

      await expect(
        marketController.createMarket(
          eventStartTime,
          eventEndTime,
          LATITUDE,
          0 // Invalid longitude
        )
      ).to.be.revertedWithCustomError(marketController, "InvalidCoordinates");
    });

    it("Should fail to create market if end time is before or equal to start time", async function () {
      const now = await time.latest();
      const eventStartTime = now + (2 * 86400);
      const invalidEndTime = eventStartTime; // End time equal to start time

      await expect(
        marketController.createMarket(
          eventStartTime,
          invalidEndTime,
          LATITUDE,
          LONGITUDE
        )
      ).to.be.revertedWithCustomError(marketFactory, "InvalidTimeParameters");
    });
  });
}); 