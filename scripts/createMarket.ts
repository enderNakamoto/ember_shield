import { ethers } from "hardhat";

async function main() {
  try {
    const [owner] = await ethers.getSigners();
    console.log("Creating market with account:", owner.address);

    // Contract addresses from previous deployment
    const MARKET_CONTROLLER = "0x459D3eF82e01393386742a560F8C2bf4b4c3964E";
    const MOCK_ERC20 = "0x63bE3667E50c70EA5aCf6dBcab61eF8d53CbFF91"; // Exact address from deployment

    // Get contract instances
    const marketController = await ethers.getContractAt("MarketController", MARKET_CONTROLLER);
    const mockERC20 = await ethers.getContractAt("MockERC20", MOCK_ERC20);

    // Set up market parameters
    const now = Math.floor(Date.now() / 1000);
    const eventStartTime = now + (2 * 86400); // Start in 2 days
    const eventEndTime = now + (30 * 86400); // End in 30 days

    // Set up coordinates (example: Tokyo)
    const latitude = Math.floor(35.6762 * 1000000); // Convert to 6 decimal places
    const longitude = Math.floor(139.6503 * 1000000); // East longitude (positive)

    console.log("\nCreating market with parameters:");
    console.log("Event Start Time:", new Date(eventStartTime * 1000).toLocaleString());
    console.log("Event End Time:", new Date(eventEndTime * 1000).toLocaleString());
    console.log("Latitude:", latitude / 1000000);
    console.log("Longitude:", longitude / 1000000);

    // Create market with gas estimation
    console.log("\nEstimating gas for market creation...");
    const gasEstimate = await marketController.createMarket.estimateGas(
      eventStartTime,
      eventEndTime,
      latitude,
      longitude
    );
    console.log("Estimated gas:", gasEstimate.toString());

    console.log("\nCreating market...");
    const tx = await marketController.createMarket(
      eventStartTime,
      eventEndTime,
      latitude,
      longitude,
      {
        gasLimit: Math.floor(Number(gasEstimate) * 1.2) // Add 20% buffer
      }
    );
    console.log("Transaction hash:", tx.hash);
    
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Get market details from events
    const marketCreatedEvent = receipt?.logs.find(
      (log: any) => log.fragment?.name === "MarketStateChanged"
    );

    if (marketCreatedEvent) {
      const marketId = marketCreatedEvent.args[0];
      const [riskVault, hedgeVault] = await marketController.getMarketVaults(marketId);

      console.log("\nMarket created successfully!");
      console.log("Market ID:", marketId);
      console.log("Risk Vault:", riskVault);
      console.log("Hedge Vault:", hedgeVault);

      // Approve tokens for both vaults
      const approveAmount = ethers.parseUnits("1000000", 18); // 1M tokens
      console.log("\nApproving tokens for vaults...");
      
      const approveRisk = await mockERC20.approve(riskVault, approveAmount);
      await approveRisk.wait();
      console.log("Approved tokens for Risk Vault");
      
      const approveHedge = await mockERC20.approve(hedgeVault, approveAmount);
      await approveHedge.wait();
      console.log("Approved tokens for Hedge Vault");
      
      console.log("\nSetup complete!");
    }
  } catch (error: any) {
    console.error("\nError details:");
    console.error("Message:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 