import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
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

  // Deploy MarketFactory with MarketController and MockERC20 addresses
  console.log("Deploying MarketFactory...");
  const MarketFactoryFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactoryFactory.deploy(
    marketControllerAddress,
    mockERC20Address
  );
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log("MarketFactory deployed to:", marketFactoryAddress);

  // Set MarketFactory address in MarketController
  console.log("Setting MarketFactory in MarketController...");
  const setFactoryTx = await marketController.setMarketFactory(marketFactoryAddress);
  await setFactoryTx.wait();
  console.log("MarketFactory set in MarketController");

  // Mint some tokens to the deployer for testing
  const mintAmount = ethers.parseUnits("10000", 18);
  console.log("Minting tokens to deployer...");
  const mintTx = await mockERC20.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("Tokens minted to deployer");

  // Save deployment addresses to a config file
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 