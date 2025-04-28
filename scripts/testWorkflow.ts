import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import { sleep } from "./fdcExample/Base";

/**
 * Runs a full workflow test:
 * 1. Deploy contracts
 * 2. Create a market
 * 3. Force liquidation using the mock fire detection API
 */
async function main() {
  console.log("Starting full workflow test on network:", network.name);
  
  // Deploy contracts
  console.log("\n=== STEP 1: DEPLOY CONTRACTS ===");
  const deploymentData = await deployContracts();
  
  // Create a market
  console.log("\n=== STEP 2: CREATE MARKET ===");
  const marketData = await createMarket(deploymentData);
  
  // If we want to test with actual time passing, we'd wait here
  // Instead, we'll use a test-only function to skip the wait time
  console.log("\n=== STEP 3: PREPARE MARKET FOR LIQUIDATION ===");
  await prepareForLiquidation(deploymentData, marketData.marketId);
  
  // Liquidate the market using mock fire data
  console.log("\n=== STEP 4: LIQUIDATE MARKET ===");
  await liquidateMarket(deploymentData, marketData.marketId);
  
  // Verify final state
  console.log("\n=== STEP 5: VERIFY FINAL STATE ===");
  await verifyLiquidation(deploymentData, marketData.marketId);
  
  console.log("\n=== WORKFLOW TEST COMPLETED SUCCESSFULLY ===");
}

async function deployContracts() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MockERC20 for testing
  console.log("Deploying MockERC20...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20Factory.deploy("Mock USDC", "mUSDC");
  await mockERC20.waitForDeployment();
  const mockERC20Address = await mockERC20.getAddress();
  console.log("MockERC20 deployed to:", mockERC20Address);

  // Deploy MarketController
  console.log("Deploying MarketController...");
  const MarketControllerFactory = await ethers.getContractFactory("MarketController");
  const marketController = await MarketControllerFactory.deploy();
  await marketController.waitForDeployment();
  const marketControllerAddress = await marketController.getAddress();
  console.log("MarketController deployed to:", marketControllerAddress);

  // Deploy MarketFactory
  console.log("Deploying MarketFactory...");
  const MarketFactoryFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactoryFactory.deploy(
    marketControllerAddress,
    mockERC20Address
  );
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log("MarketFactory deployed to:", marketFactoryAddress);

  // Set MarketFactory in MarketController
  console.log("Setting MarketFactory in MarketController...");
  const setFactoryTx = await marketController.setMarketFactory(marketFactoryAddress);
  await setFactoryTx.wait();
  console.log("MarketFactory set in MarketController");

  // Mint tokens to the deployer for testing
  const mintAmount = ethers.parseUnits("10000", 18);
  console.log("Minting tokens to deployer...");
  const mintTx = await mockERC20.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("Tokens minted to deployer");

  // Save deployment addresses
  const deploymentData = {
    mockERC20: mockERC20Address,
    marketController: marketControllerAddress,
    marketFactory: marketFactoryAddress
  };

  const configDir = path.join(__dirname, "config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, "addresses.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("Deployment addresses saved to scripts/config/addresses.json");

  return deploymentData;
}

async function createMarket(deploymentData: any) {
  console.log("Creating a new market...");
  
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(deploymentData.marketController);
  
  // Set up market times - for testing, we'll make it start immediately
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60; // Start in 1 minute
  const endTime = now + (30 * 86400); // End in 30 days
  
  // Using Tokyo coordinates (positive values)
  const latitude = Math.floor(35.6762 * 1000000);
  const longitude = Math.floor(139.6503 * 1000000);

  console.log(`Creating market with parameters:
  - Start Time: ${new Date(startTime * 1000).toLocaleString()}
  - End Time: ${new Date(endTime * 1000).toLocaleString()}
  - Latitude: ${latitude} (${latitude / 1000000})
  - Longitude: ${longitude} (${longitude / 1000000})
  `);

  // Create the market
  const tx = await controller.createMarket(
    startTime,
    endTime,
    latitude,
    longitude
  );
  console.log("Transaction sent:", tx.hash);
  
  // Wait for transaction to be mined
  const receipt = await tx.wait();
  console.log("Transaction confirmed");
  
  // Get market ID from event
  const events = receipt.logs
    .map((log: any) => {
      try {
        return MarketController.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
  
  const marketStateEvent = events.find(event => event?.name === "MarketStateChanged");
  
  if (!marketStateEvent || !marketStateEvent.args) {
    throw new Error("Could not find MarketStateChanged event");
  }
  
  const marketId = marketStateEvent.args[0];
  console.log(`Market created with ID: ${marketId}`);
  
  // Save market ID
  const marketData = { marketId: marketId.toString() };
  const configDir = path.join(__dirname, "config");
  fs.writeFileSync(
    path.join(configDir, "market.json"),
    JSON.stringify(marketData, null, 2)
  );
  console.log("Market ID saved to scripts/config/market.json");
  
  return marketData;
}

async function prepareForLiquidation(deploymentData: any, marketId: string) {
  console.log(`Preparing market ${marketId} for liquidation...`);
  
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(deploymentData.marketController);
  
  // First, check current market state
  const stateIndex = await controller.getMarketState(marketId);
  const states = ["NotSet", "Open", "Locked", "Matured", "Liquidated"];
  console.log(`Current market state: ${states[stateIndex]}`);
  
  // We can only liquidate a locked market, so we need to lock it first if it's open
  if (stateIndex === 1) { // Open
    console.log("Market is Open, attempting to lock it...");
    
    // If time hasn't passed yet, we can force it using the test helper
    // Check if we can use the test helper function to advance time
    let canForceLock = false;
    try {
      canForceLock = await controller.testLockMarket.estimateGas(marketId);
    } catch (e) {
      // Function doesn't exist in production environment
      canForceLock = false;
    }
    
    if (canForceLock) {
      // Use test helper to force lock
      console.log("Using test helper to force lock the market");
      const tx = await controller.testLockMarket(marketId);
      await tx.wait();
    } else {
      // Otherwise, try to lock normally
      console.log("Locking market normally");
      const tx = await controller.lockMarket(marketId);
      await tx.wait();
    }
    
    // Confirm market is now locked
    const newStateIndex = await controller.getMarketState(marketId);
    console.log(`New market state: ${states[newStateIndex]}`);
    
    if (newStateIndex !== 2) { // Not Locked
      throw new Error("Failed to lock market");
    }
  } else if (stateIndex !== 2) { // Not Locked
    throw new Error(`Market is in state ${states[stateIndex]} and cannot be liquidated`);
  }
  
  console.log("Market is ready for liquidation");
}

async function liquidateMarket(deploymentData: any, marketId: string) {
  console.log(`Liquidating market ${marketId}...`);
  
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(deploymentData.marketController);
  
  // Check if test liquidation function is available
  let canTestLiquidate = false;
  try {
    canTestLiquidate = await controller.testLiquidateMarket.estimateGas(marketId);
  } catch (e) {
    // Function doesn't exist in production environment
    canTestLiquidate = false;
  }
  
  if (canTestLiquidate) {
    // Use test function to directly liquidate (for testing only)
    console.log("Using test helper to directly liquidate the market");
    const tx = await controller.testLiquidateMarket(marketId);
    await tx.wait();
  } else {
    // Use mock fire data to liquidate via processOracleData
    console.log("Using processOracleData with mock fire data");
    
    // Create a simple mock proof (in a real scenario, this would come from FDC)
    const mockProof = {
      merkleProof: "0x" + "1".repeat(64),
      data: "0x" + "2".repeat(64) // Would contain encoded data showing fire = 1
    };
    
    // Call processOracleData
    const tx = await controller.processOracleData(marketId, mockProof);
    await tx.wait();
  }
  
  console.log("Liquidation transaction completed");
}

async function verifyLiquidation(deploymentData: any, marketId: string) {
  console.log(`Verifying liquidation of market ${marketId}...`);
  
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(deploymentData.marketController);
  
  // Check final market state
  const stateIndex = await controller.getMarketState(marketId);
  const states = ["NotSet", "Open", "Locked", "Matured", "Liquidated"];
  console.log(`Final market state: ${states[stateIndex]}`);
  
  // Check liquidation status
  const [hasLiquidated, liquidationTime] = await controller.getLiquidationState(marketId);
  console.log(`Has liquidated: ${hasLiquidated}`);
  console.log(`Liquidation time: ${liquidationTime} (${new Date(Number(liquidationTime) * 1000).toLocaleString()})`);
  
  // Verification
  if (stateIndex !== 4 || !hasLiquidated) { // Not Liquidated
    throw new Error("Market was not properly liquidated");
  }
  
  console.log("Market was successfully liquidated!");
}

// Run the full workflow
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 