import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Load deployed contract addresses
let addresses: { 
  marketController: string;
  marketFactory: string;
  mockERC20: string;
};

try {
  const addressesPath = path.join(__dirname, "config", "addresses.json");
  addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
} catch (error) {
  console.error("Failed to load addresses from config file");
  addresses = {
    marketController: "YOUR_MARKET_CONTROLLER_ADDRESS", // Replace with your deployed address if not using our deploy script
    marketFactory: "",
    mockERC20: ""
  };
}

async function main() {
  console.log("Loading contracts...");
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(addresses.marketController);
  console.log("MarketController loaded at:", addresses.marketController);

  // Set up market times - use immediate start time for testing
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 10; // Start in just 10 seconds
  const endTime = now + (5 * 86400); // End in 5 days
  
  // Using Tokyo coordinates (positive values)
  const latitude = Math.floor(35.6762 * 1000000);  // Tokyo latitude
  const longitude = Math.floor(139.6503 * 1000000); // Tokyo longitude

  console.log(`Creating market with parameters:
  - Start Time: ${new Date(startTime * 1000).toLocaleString()} (in 10 seconds)
  - End Time: ${new Date(endTime * 1000).toLocaleString()}
  - Latitude: ${latitude} (${latitude / 1000000})
  - Longitude: ${longitude} (${longitude / 1000000})
  `);

  try {
    // Create the market
    const tx = await controller.createMarket(
      startTime,
      endTime,
      latitude,
      longitude
    );
    console.log("Transaction sent:", tx.hash);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction confirmed");
    
    // Get the market ID from the event
    const events = receipt.logs
      .map(log => {
        try {
          return MarketController.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
    
    const marketStateEvent = events.find(event => event?.name === "MarketStateChanged");
    const marketId = marketStateEvent?.args[0];
    
    if (marketId) {
      console.log(`Market created with ID: ${marketId}`);
      
      // Save the market ID to a file for other scripts to use
      const marketData = { marketId: marketId.toString() };
      const configDir = path.join(__dirname, "config");
      fs.writeFileSync(
        path.join(configDir, "market.json"),
        JSON.stringify(marketData, null, 2)
      );
      console.log("Market ID saved to scripts/config/market.json");
      
      // Skip the market details since it's causing errors
      
      console.log("\nIMPORTANT: The market will be ready to lock in 10 seconds.");
      console.log("After that time, run: npx hardhat run scripts/lockMarket.ts --network coston2");
      console.log("Then, to liquidate: npx hardhat run scripts/liquidateMarket.ts --network coston2");
    } else {
      console.log("Could not determine market ID from transaction");
    }
    
  } catch (error) {
    console.error("Error creating market:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 