import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Load deployed contract addresses
let addresses: { 
  marketController: string;
  marketFactory: string;
  mockERC20: string;
};

// Load market ID
let marketData: {
  marketId: string;
};

try {
  const addressesPath = path.join(__dirname, "config", "addresses.json");
  addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  
  const marketPath = path.join(__dirname, "config", "market.json");
  marketData = JSON.parse(fs.readFileSync(marketPath, 'utf8'));
} catch (error) {
  console.error("Failed to load config files");
  addresses = {
    marketController: "YOUR_MARKET_CONTROLLER_ADDRESS",
    marketFactory: "",
    mockERC20: ""
  };
  marketData = {
    marketId: "1" // Default market ID
  };
}

async function main() {
  console.log("Loading contract...");
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(addresses.marketController);
  console.log("MarketController loaded at:", addresses.marketController);
  
  const marketId = marketData.marketId;
  console.log(`Attempting to lock market with ID: ${marketId}`);
  
  // We'll skip getting market details and state since they seem to be having issues
  // Just try to lock directly
  
  try {
    console.log("Attempting to lock the market...");
    
    // First try with test function (for testing environments)
    let success = false;
    
    try {
      console.log("Trying standard lock function...");  
      // Try standard lock function
      const tx = await controller.lockMarket(marketId);
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      success = true;
      console.log("Market locked using standard function.");
    } catch (e: any) {
      console.error("Error locking market:", e.message);
      console.log("The market might not be ready to lock yet (event hasn't started)");
      console.log("Or it might already be in a locked state.");
      
      // If there's a specific error about the event not having started yet
      if (e.message && e.message.includes("EventNotStartedYet")) {
        console.log("\nCannot lock yet - event hasn't started.");
        console.log("Please wait until the event start time before trying again.");
      }
    }
    
    if (success) {
      console.log("Market successfully locked!");
    }
  } catch (error) {
    console.error("Error during market locking process:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 