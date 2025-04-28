import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { sleep } from "./fdcExample/Base";

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
  console.log(`Attempting to liquidate market with ID: ${marketId}`);
  
  // Skip getting market details and state and go straight to liquidation attempt
  
  try {
    // Try to liquidate using different methods
    let success = false;
    
    // Try using processOracleData with mock data
    console.log("Creating mock proof for fire detection...");
    
    // Create a mock IJsonApi.Proof object
    // Properly formatted with the data needed by the contract
    const mockProof = {
      sources: [ethers.ZeroAddress],
      requestBody: {
        url: "https://flarefire-production.up.railway.app/check-fire-mock",
        abi_encoded_data: "0x"
      },
      responseBody: {
        status_code: 200,
        headers: "",
        abi_encoded_data: ethers.solidityPacked(
          ["int256", "int256", "uint256"],
          [35676200, 139650300, 1] // Tokyo coordinates with fire=1
        )
      },
      merkleProof: []
    };
    
    // Retry mechanism
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt} to process oracle data...`);
        console.log("Proof data:", {
          latitude: 35676200,
          longitude: 139650300,
          fire: 1
        });
        
        const tx = await controller.processOracleData(marketId, mockProof);
        console.log("Transaction sent:", tx.hash);
        
        await tx.wait();
        console.log("Transaction confirmed!");
        success = true;
        break;
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed: ${err.message}`);
        
        if (attempt < 3) {
          console.log("Waiting before retry...");
          await sleep(10000); // Wait 10 seconds before retrying
        }
      }
    }
    
    if (success) {
      console.log("Oracle data processed successfully!");
      console.log("Market should now be in LIQUIDATED state if coordinates and fire data matched.");
    } else {
      console.log("All liquidation attempts failed.");
      console.log("The market might not be in the correct state (must be LOCKED)");
      console.log("Or the coordinates in the proof didn't match the market coordinates.");
    }
  } catch (error) {
    console.error("Error liquidating market:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 