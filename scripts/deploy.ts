import hre, { run, ethers } from "hardhat";

async function deployAndVerify() {
  const [owner] = await ethers.getSigners();
  console.log("Deploying contracts with account:", owner.address);

  // 1. Deploy Mock ERC20
  console.log("\nDeploying Mock ERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await (await MockERC20.deploy("Mock USD", "mUSD")).waitForDeployment();

  // Mint tokens to owner
  const mintAmount = ethers.parseUnits("10000000", 18); // 10M tokens
  await mockERC20.mint(owner.address, mintAmount);

  console.log(`Mock ERC20 deployed to: ${await mockERC20.getAddress()}`);
  console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} tokens to ${owner.address}`);

  // 2. Deploy MarketController
  console.log("\nDeploying MarketController...");
  const MarketController = await ethers.getContractFactory("MarketController");
  const marketController = await (await MarketController.deploy()).waitForDeployment();
  console.log(`MarketController deployed to: ${await marketController.getAddress()}`);

  // 3. Deploy MarketFactory
  console.log("\nDeploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await (await MarketFactory.deploy(
    await marketController.getAddress(),
    await mockERC20.getAddress()
  )).waitForDeployment();
  console.log(`MarketFactory deployed to: ${await marketFactory.getAddress()}`);

  // 4. Link Controller to Factory
  console.log("\nLinking MarketController to MarketFactory...");
  await marketController.setMarketFactory(await marketFactory.getAddress());
  console.log("Link complete");

  // 5. Verify contracts
  console.log("\nVerifying contracts...");
  try {
    // Verify MockERC20
    await run("verify:verify", {
      address: await mockERC20.getAddress(),
      constructorArguments: ["Mock USD", "mUSD"],
    });
    console.log("MockERC20 verified");

    // Verify MarketController
    await run("verify:verify", {
      address: await marketController.getAddress(),
      constructorArguments: [],
    });
    console.log("MarketController verified");

    // Verify MarketFactory
    await run("verify:verify", {
      address: await marketFactory.getAddress(),
      constructorArguments: [await marketController.getAddress(), await mockERC20.getAddress()],
    });
    console.log("MarketFactory verified");
  } catch (e: any) {
    console.log("Verification error:", e);
  }

  // Print summary
  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`MockERC20: ${await mockERC20.getAddress()}`);
  console.log(`MarketController: ${await marketController.getAddress()}`);
  console.log(`MarketFactory: ${await marketFactory.getAddress()}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Token Balance: ${await mockERC20.balanceOf(owner.address)}`);
}

void deployAndVerify().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
}); 