import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { MarketController } from "../typechain-types";

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
  const MarketControllerFactory = await ethers.getContractFactory("MarketController");
  const controller = await MarketControllerFactory.attach(addresses.marketController) as MarketController;
  console.log("MarketController loaded at:", addresses.marketController);
  
  const marketId = marketData.marketId;
  console.log(`Checking market with ID: ${marketId}`);
  
  // Get market state
  const marketStateIndex = await controller.getMarketState(marketId);
  const states = ["NotSet", "Open", "Locked", "Matured", "Liquidated"];
  const marketState = states[Number(marketStateIndex)];
  console.log(`Market state: ${marketState} (${marketStateIndex})`);
  
  // Get liquidation state
  const [hasLiquidated, liquidationTime] = await controller.getLiquidationState(marketId);
  console.log(`Has liquidated: ${hasLiquidated}`);
  
  if (hasLiquidated) {
    const date = new Date(Number(liquidationTime) * 1000);
    console.log(`Liquidation time: ${date.toLocaleString()}`);
  }
  
  try {
    // Get vaults
    const [riskVaultAddr, hedgeVaultAddr] = await controller.getMarketVaults(marketId);
    console.log(`Risk vault: ${riskVaultAddr}`);
    console.log(`Hedge vault: ${hedgeVaultAddr}`);
    
    // Get asset balance in vaults
    const riskVault = await ethers.getContractAt("RiskVault", riskVaultAddr);
    const hedgeVault = await ethers.getContractAt("HedgeVault", hedgeVaultAddr);
    
    const assetAddress = await riskVault.asset();
    const token = await ethers.getContractAt("MockERC20", assetAddress);
    
    const riskBalance = await token.balanceOf(riskVaultAddr);
    const hedgeBalance = await token.balanceOf(hedgeVaultAddr);
    
    console.log(`Risk vault balance: ${ethers.formatUnits(riskBalance, 18)} tokens`);
    console.log(`Hedge vault balance: ${ethers.formatUnits(hedgeBalance, 18)} tokens`);
  } catch (error) {
    console.error("Error getting vault information:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 