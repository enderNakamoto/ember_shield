import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Load environment variables
dotenv.config();

/**
 * This script simulates a complete workflow using Mock FDC attestation
 * It creates a market, deposits funds, locks it, and liquidates it using mock fire data
 */
async function main() {
  console.log("Starting FDC attestation workflow simulation...");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Using deployer address: ${deployer.address}`);
  console.log(`Using user1 address: ${user1.address}`);
  console.log(`Using user2 address: ${user2.address}`);
  
  // Tokyo coordinates
  const TOKYO_LATITUDE = Math.floor(35.6762 * 1000000);
  const TOKYO_LONGITUDE = Math.floor(139.6503 * 1000000);
  
  // Deploy contracts
  console.log("\n1. DEPLOYING CONTRACTS");
  
  // Deploy MockERC20
  console.log("Deploying MockERC20...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20Factory.deploy("Mock USDC", "mUSDC");
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log(`MockERC20 deployed to: ${mockTokenAddress}`);
  
  // Mint tokens to users for testing
  const mintAmount = ethers.parseUnits("10000", 18);
  await mockToken.mint(deployer.address, mintAmount);
  await mockToken.mint(user1.address, mintAmount);
  await mockToken.mint(user2.address, mintAmount);
  console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} tokens to each user`);
  
  // Deploy MarketController
  console.log("Deploying MarketController...");
  const MarketControllerFactory = await ethers.getContractFactory("MarketController");
  const marketController = await MarketControllerFactory.deploy();
  await marketController.waitForDeployment();
  const marketControllerAddress = await marketController.getAddress();
  console.log(`MarketController deployed to: ${marketControllerAddress}`);
  
  // Deploy MarketFactory
  console.log("Deploying MarketFactory...");
  const MarketFactoryFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactoryFactory.deploy(
    marketControllerAddress,
    mockTokenAddress
  );
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log(`MarketFactory deployed to: ${marketFactoryAddress}`);
  
  // Set factory in controller
  await marketController.setMarketFactory(marketFactoryAddress);
  console.log("MarketFactory linked to MarketController");
  
  // Create market
  console.log("\n2. CREATING MARKET");
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 10; // 10 seconds from now
  const endTime = now + (5 * 86400); // 5 days from now
  
  console.log(`Market parameters:`);
  console.log(`- Start Time: ${new Date(startTime * 1000).toLocaleString()}`);
  console.log(`- End Time: ${new Date(endTime * 1000).toLocaleString()}`);
  console.log(`- Latitude: ${TOKYO_LATITUDE / 1000000}° (${TOKYO_LATITUDE})`);
  console.log(`- Longitude: ${TOKYO_LONGITUDE / 1000000}° (${TOKYO_LONGITUDE})`);
  
  const createTx = await marketController.createMarket(
    startTime,
    endTime,
    TOKYO_LATITUDE,
    TOKYO_LONGITUDE
  );
  
  const createReceipt = await createTx.wait();
  console.log(`Market creation transaction: ${createTx.hash}`);
  
  // Find the marketId from event logs
  let marketId: bigint;
  const marketCreatedEvent = createReceipt?.logs.find(
    (log: any) => {
      if (typeof log.fragment !== 'undefined' && log.fragment?.name === "MarketStateChanged") {
        return true;
      }
      return false;
    }
  );
  
  if (marketCreatedEvent && 'args' in marketCreatedEvent) {
    marketId = marketCreatedEvent.args[0];
    console.log(`Created market with ID: ${marketId}`);
  } else {
    throw new Error("Failed to get market ID from event logs");
  }
  
  // Get vault addresses
  const [riskVaultAddr, hedgeVaultAddr] = await marketController.getMarketVaults(marketId);
  console.log(`Risk vault: ${riskVaultAddr}`);
  console.log(`Hedge vault: ${hedgeVaultAddr}`);
  
  // Get vault contracts
  const riskVault = await ethers.getContractAt("RiskVault", riskVaultAddr);
  const hedgeVault = await ethers.getContractAt("HedgeVault", hedgeVaultAddr);
  
  // Deposit funds
  console.log("\n3. DEPOSITING FUNDS");
  const depositAmount = ethers.parseUnits("1000", 18);
  
  // User1 deposits to risk vault
  console.log("User1 depositing to risk vault...");
  await mockToken.connect(user1).approve(riskVaultAddr, depositAmount);
  await riskVault.connect(user1).deposit(depositAmount, user1.address);
  const user1Shares = await riskVault.balanceOf(user1.address);
  console.log(`User1 received ${ethers.formatUnits(user1Shares, 18)} risk vault shares`);
  
  // User2 deposits to hedge vault
  console.log("User2 depositing to hedge vault...");
  await mockToken.connect(user2).approve(hedgeVaultAddr, depositAmount);
  await hedgeVault.connect(user2).deposit(depositAmount, user2.address);
  const user2Shares = await hedgeVault.balanceOf(user2.address);
  console.log(`User2 received ${ethers.formatUnits(user2Shares, 18)} hedge vault shares`);
  
  // Lock market
  console.log("\n4. LOCKING MARKET");
  // We need to wait until the start time
  const currentTime = await time.latest();
  if (currentTime < startTime) {
    console.log(`Waiting until market start time: ${new Date(startTime * 1000).toLocaleString()}`);
    await time.increaseTo(startTime + 1);
    console.log("Time advanced to start time");
  }
  
  const lockTx = await marketController.lockMarket(marketId);
  await lockTx.wait();
  console.log(`Market locked with transaction: ${lockTx.hash}`);
  
  const state = await marketController.getMarketState(marketId);
  console.log(`Market state is now: ${state} (2 = Locked)`);
  
  // Simulate FDC attestation with mock data
  console.log("\n5. SIMULATING FDC ATTESTATION");
  console.log("Preparing mock FDC attestation data...");
  
  // Structure for IJsonApi.Proof
  const mockProof = {
    sources: [ethers.ZeroAddress],
    requestBody: {
      url: "https://flarefire-production.up.railway.app/check-fire-mock",
      abi_encoded_data: ethers.solidityPacked(
        ["int256", "int256"],
        [TOKYO_LATITUDE, TOKYO_LONGITUDE]
      )
    },
    responseBody: {
      status_code: 200,
      headers: "",
      abi_encoded_data: ethers.solidityPacked(
        ["int256", "int256", "uint256"],
        [TOKYO_LATITUDE, TOKYO_LONGITUDE, 1] // Always returns fire=1
      )
    },
    merkleProof: []
  };
  
  console.log("Mock FDC proof created:");
  console.log("- API endpoint: https://flarefire-production.up.railway.app/check-fire-mock");
  console.log(`- Requesting data for: ${TOKYO_LATITUDE / 1000000}°, ${TOKYO_LONGITUDE / 1000000}°`);
  console.log("- Response: Fire detected (1)");
  
  console.log("\nIn a real FDC implementation, attestation would go through these steps:");
  console.log("1. Market liquidation request is sent to Flare Data Contract (FDC)");
  console.log("2. Multiple verifiers independently query the API and validate responses");
  console.log("3. Once consensus is reached, a Merkle proof is generated");
  console.log("4. The proof with attested data is submitted to processOracleData");
  console.log("\nWaiting 4 minutes to simulate the FDC attestation process...");
  
  // Sleep for 4 minutes to simulate the FDC attestation process
  for (let i = 0; i < 4; i++) {
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    console.log(`Attestation in progress... ${i+1}/4 minutes elapsed`);
  }
  
  console.log("\nAttestation complete. Processing oracle data with proof...");
  
  // Process oracle data with proof
  const liquidateTx = await marketController.processOracleData(marketId, mockProof);
  
  await liquidateTx.wait();
  console.log(`Market liquidated with transaction: ${liquidateTx.hash}`);
  
  // Check liquidation state
  const [hasLiquidated, liquidationTime] = await marketController.getLiquidationState(marketId);
  console.log(`Market liquidated: ${hasLiquidated}`);
  console.log(`Liquidation time: ${new Date(Number(liquidationTime) * 1000).toLocaleString()}`);
  
  // Check final state
  const finalState = await marketController.getMarketState(marketId);
  console.log(`Final market state: ${finalState} (4 = Liquidated)`);
  
  // Check withdrawals
  console.log("\n6. TESTING WITHDRAWALS AFTER LIQUIDATION");
  
  // Get balances before withdrawal
  const user1BalanceBefore = await mockToken.balanceOf(user1.address);
  const user2BalanceBefore = await mockToken.balanceOf(user2.address);
  
  console.log("User1 (risk vault) balance before withdrawal:");
  console.log(`- Token balance: ${ethers.formatUnits(user1BalanceBefore, 18)}`);
  console.log(`- Risk vault shares: ${ethers.formatUnits(await riskVault.balanceOf(user1.address), 18)}`);
  
  console.log("User2 (hedge vault) balance before withdrawal:");
  console.log(`- Token balance: ${ethers.formatUnits(user2BalanceBefore, 18)}`);
  console.log(`- Hedge vault shares: ${ethers.formatUnits(await hedgeVault.balanceOf(user2.address), 18)}`);
  
  // Withdraw from vaults
  console.log("\nWithdrawing from vaults...");
  
  // Risk vault user withdraws (should get nothing since market was liquidated)
  console.log("User1 redeeming risk vault shares...");
  const riskShares = await riskVault.balanceOf(user1.address);
  await riskVault.connect(user1).redeem(riskShares, user1.address, user1.address);
  
  // Hedge vault user withdraws (should get all funds)
  console.log("User2 redeeming hedge vault shares...");
  const hedgeShares = await hedgeVault.balanceOf(user2.address);
  await hedgeVault.connect(user2).redeem(hedgeShares, user2.address, user2.address);
  
  // Get balances after withdrawal
  const user1BalanceAfter = await mockToken.balanceOf(user1.address);
  const user2BalanceAfter = await mockToken.balanceOf(user2.address);
  
  console.log("\nUser1 (risk vault) balance after withdrawal:");
  console.log(`- Token balance: ${ethers.formatUnits(user1BalanceAfter, 18)}`);
  console.log(`- Change: ${ethers.formatUnits(user1BalanceAfter - user1BalanceBefore, 18)}`);
  
  console.log("User2 (hedge vault) balance after withdrawal:");
  console.log(`- Token balance: ${ethers.formatUnits(user2BalanceAfter, 18)}`);
  console.log(`- Change: ${ethers.formatUnits(user2BalanceAfter - user2BalanceBefore, 18)}`);
  
  console.log("\nWorkflow simulation complete!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 