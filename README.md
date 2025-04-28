# 🔥 Ember Shield

![alt text](images/cover.png)

## Demo 
https://ember-shield-git-main-enders-projects.vercel.app/



## What We’re Building

We’re building a **decentralized parametric fire insurance** solution on **Flare Network**, leveraging FDC’s JsonAPI attestation type and satellite data from NASA’s FRMS API. Our smart contracts and trusted oracles deliver **instant, transparent, and fair** payouts to communities in extreme wildfire zones—areas where traditional insurers have withdrawn.

> **Hackathon MVP:** a proof-of-concept to showcase the flexibility and speed of our framework—not a finished product, but a glimpse of what’s coming.

## Why It Matters

We have family near Paradise, Northern California—the town destroyed by the 2018 fire. Properties in the region are tagged “Extreme Risk” with **9/10 Fire Factor™** and up to **48% wildfire probability** over 30 years.

Here’s a map of all active fires in September 2024 across the continental US, during the LA fire events:

![image info](images/fire_map.png)

Traditional insurers are pulling out, premiums are soaring, and claims processes drag on. Communities are left vulnerable and frustrated. The tragic case of **Luigi Mangione**, who turned to violence over a denied claim in a different insurance vertical, highlights the **opaque and adversarial** nature of today’s industry. It’s clear: insurance needs a complete reset.

## How It Works

- **Blockchain Backbone:** Built on Flare Network for low-cost, scalable contracts  
- **Real-Time Data:** FDC’s JsonAPI pulls wildfire metrics directly from NASA’s FRMS API  
- **Trustless Verification:** Satellite-verified data feeds enforce on-chain triggers  
- **Automated Payouts:** Claims settle the moment damage thresholds are met—no manual steps, no delays  

By combining reliable oracle data with smart-contract automation, FireBastion turns a slow, opaque claims process into one that’s **data-driven and instant**—bringing fairness back to wildfire insurance.


## Architecture

Ember Shield creates fire insurance markets where users can deposit funds to either:
1. Hedge against the risk of fire (receive payout if a fire occurs)
2. Earn yield by taking on risk (receive premium if no fire occurs)

The platform uses Flare's decentralized oracle system to detect fires in specific locations and automatically trigger liquidations when fires are detected.

![Vault Architecture](images/architecture.png)



### Smart Contracts

- **MarketController**: Manages market states and processes oracle data
- **MarketFactory**: Creates market vaults
- **RiskVault**: ERC4626 tokenized vault for risk-taking participants
- **HedgeVault**: ERC4626 tokenized vault for hedging participants

### Fire Detection API

Our fire detection API is deployed at `https://flarefire-production.up.railway.app` with the following endpoints:

1. `/health` - Health check endpoint
2. `/check-fire` - Checks for fires using NASA FIRMS data for a given location
3. `/check-fire-mock` - Mock endpoint that always returns a fire detected (for testing)

### Mock API Response

Our mock endpoint always returns the following data:

```json
{
  "latitude": 37772760,
  "longitude": -122454362,
  "fire_detected": 1
}
```

This guarantees that liquidation will occur when coordinates match, making it perfect for testing the full attestation flow on Coston2.

![alt text](image.png)

### Flare Oracle Integration

The system uses Flare's FDC (Flare Data Contract) to fetch and validate external data:

1. FDC queries our API for fire detection data
2. Oracle validators verify the data and provide proofs
3. Smart contracts validate these proofs and trigger liquidation if a fire is detected

#### Controller Contract 
```
 /**
     * @notice Processes oracle data and triggers liquidation or maturation if needed
     * @param marketId The ID of the market
     * @param proof The proof of the oracle data
     */
    function processOracleData(
        uint256 marketId,
        IJsonApi.Proof calldata proof
    ) public marketFactoryMustBeSet {

        // get market details stored in the contract
        MarketState currentState = _marketStates[marketId];
        MarketDetails storage details = _marketDetails[marketId];

        // validate the proof
        require(isJsonApiProofValid(proof), "Invalid proof");

        // decode the incoming data
        DataTransportObject memory dto = abi.decode(proof.data.responseBody.abi_encoded_data, (DataTransportObject));

        // Handle liquidation case
        if (
            dto.latitude == details.latitude && 
            dto.longitude == details.longitude &&
            dto.fire > 0 &&
            currentState == MarketState.Locked &&
            block.timestamp >= details.eventStartTime &&
            block.timestamp <= details.eventEndTime
        ) {
            _liquidateMarket(marketId);
        }
        // Handle maturation case - event ended without liquidation
        else if (
            currentState == MarketState.Locked &&
            block.timestamp > details.eventEndTime &&
            !details.hasLiquidated
        ) {
            matureMarket(marketId);
        }
    }
 ```   

This is called from FDC Attestation Script 

```
mport { ethers } from "hardhat";
import {
  prepareAttestationRequestBase,
  submitAttestationRequest,
  retrieveDataAndProofBase,
  sleep,
} from "./fdcExample/Base";
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

const marketId = 0; // Replace with your market ID

// Environment variables for FDC API
const {
  JQ_VERIFIER_URL_TESTNET,
  JQ_VERIFIER_API_KEY_TESTNET,
  COSTON2_DA_LAYER_URL,
} = process.env;

// JQ filter to process the API response
const postprocessJq = `{
  latitude: .latitude,
  longitude: .longitude,
  fire: .fire_detected
}`;

// ABI signature matching our DataTransportObject struct
const abiSignature = `{
  "components": [
    {
      "internalType": "int256",
      "name": "latitude",
      "type": "int256"
    },
    {
      "internalType": "int256",
      "name": "longitude",
      "type": "int256"
    },
    {
      "internalType": "uint256",
      "name": "fire",
      "type": "uint256"
    }
  ],
  "internalType": "struct DataTransportObject",
  "name": "dto",
  "type": "tuple"
}`;

const attestationTypeBase = "IJsonApi";
const sourceIdBase = "WEB2";
const verifierUrlBase = JQ_VERIFIER_URL_TESTNET!;

async function getMarket(controller: any, id: number) {
  const details = await controller.getMarketDetails(id);
  console.log("Market Details:", details, "\n");
  return details;
}

async function prepareUrl(market: any): Promise<string> {
  // Using the check-fire endpoint from our deployed API
  return `https://flarefire-production.up.railway.app/check-fire?lat=${
    market.latitude / 10 ** 6
  }&lon=${market.longitude / 10 ** 6}`;
}

async function prepareAttestationRequest(
  apiUrl: string,
  postprocessJq: string,
  abiSignature: string,
) {
  const requestBody = {
    url: apiUrl,
    postprocessJq,
    abi_signature: abiSignature,
  };

  const url = `${verifierUrlBase}JsonApi/prepareRequest`;
  const apiKey = JQ_VERIFIER_API_KEY_TESTNET!;

  return await prepareAttestationRequestBase(
    url,
    apiKey,
    attestationTypeBase,
    sourceIdBase,
    requestBody,
  );
}

async function retrieveDataAndProof(
  abiEncodedRequest: string,
  roundId: number,
) {
  const url = `${COSTON2_DA_LAYER_URL}api/v1/fdc/proof-by-request-round-raw`;
  console.log("Url:", url, "\n");
  return await retrieveDataAndProofBase(url, abiEncodedRequest, roundId);
}

async function processOracleData(
  controller: any,
  id: number,
  proof: {
    proof: string;
    response_hex: string;
  },
) {
  console.log("Proof hex:", proof.response_hex, "\n");
  
  try {
    // Decode the response directly using ethers
    // For our simple mock implementation, we'll skip complex decoding
    console.log("Preparing to call processOracleData...\n");
    
    // Retry mechanism for processing oracle data
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const transaction = await controller.processOracleData(id, {
          merkleProof: proof.proof,
          data: proof.response_hex, // In a real implementation, this would be properly decoded
        });
        console.log("Transaction:", transaction.hash, "\n");
        await transaction.wait();
        console.log("Transaction confirmed\n");
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error, "\n");
        await sleep(20000);
      }
    }
    
    throw new Error("processOracleData failed after 5 attempts");
  } catch (error) {
    console.error("Failed to process oracle data:", error);
    throw error;
  }
}

async function main() {
  console.log("Loading MarketController contract...");
  const MarketController = await ethers.getContractFactory("MarketController");
  const controller = await MarketController.attach(addresses.marketController);
  console.log("MarketController loaded at:", addresses.marketController, "\n");

  try {
    const market = await getMarket(controller, marketId);
    const apiUrl = await prepareUrl(market);
    console.log("API URL:", apiUrl, "\n");

    const data = await prepareAttestationRequest(
      apiUrl,
      postprocessJq,
      abiSignature,
    );
    console.log("Data:", data, "\n");

    const abiEncodedRequest = data.abiEncodedRequest;
    const roundId = await submitAttestationRequest(abiEncodedRequest);
    const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);

    await processOracleData(controller, marketId, proof);
    
    console.log("Oracle data processing complete!");
  } catch (error) {
    console.error("Error during oracle data processing:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 

```
## Hardhat Tests 

Ember Shield contracts have been thoroughly tested using Hardhat's testing framework. Our test suite covers all critical aspects of the system:

### Test Results

```
➜ npx hardhat test

MarketController State Transitions
  Market State Transitions
    ✔ Should start in Open state
    ✔ Should transition from Open to Locked
    ✔ Should not allow locking before start time
    ✔ Should not allow locking after end time
    ✔ Should transition from Locked to Liquidated using test function
    ✔ Should transition from Locked to Matured using test function
    ✔ Should not allow liquidation before market is locked
    ✔ Should not allow liquidation after event end time
    ✔ Should not allow maturation before event end time
    ✔ Should not allow maturation of already liquidated market
    ✔ Should not allow double liquidation

Market System Deployment and Creation
  Contract Deployment
    ✔ Should deploy all contracts with correct initialization
  Market Creation
    ✔ Should create a market with valid parameters
    ✔ Should fail to create market with invalid time parameters
    ✔ Should fail to create market with invalid coordinates
    ✔ Should fail to create market if end time is before or equal to start time

Market Vaults Operations
  Vault Setup
    ✔ Should have correct initial state
  Deposits
    ✔ Should allow deposits to risk vault
    ✔ Should allow deposits to hedge vault
    ✔ Should not allow deposits after market is locked
  Withdrawals
    ✔ Should allow withdrawals from risk vault when market is open
    ✔ Should allow withdrawals from hedge vault when market is open
    ✔ Should not allow withdrawals when market is locked

23 passing
```

### Test Coverage

Our test suite covers three main areas:

1. **Market State Transitions**:
   - Proper initialization in Open state
   - Transitions between states (Open → Locked → Liquidated/Matured)
   - State transition restrictions with appropriate checks for timing
   - Prevention of invalid state transitions

2. **System Deployment and Market Creation**:
   - Contract deployment and initialization
   - Market creation with valid parameters
   - Validation checks for time parameters and coordinates
   - Error handling for invalid market creation attempts

3. **Vault Operations**:
   - Initial vault setup and configuration
   - Deposit functionality to both risk and hedge vaults
   - Deposit restrictions after market locking
   - Withdrawal functionality during the Open state
   - Withdrawal restrictions during the Locked state

The test suite ensures that all contract functions behave as expected across different market states and conditions, providing confidence in the security and reliability of the Ember Shield protocol.


## Test Workflow Without FDC Attestation

We've deployed and tested our contracts on the Coston2 network, using a simplified workflow that bypasses the actual FDC attestation process for testing purposes.

### Deployed Contracts (Coston2)

- **MockERC20**: [0x9Ea879f767730F308061e48Df773EfBA48A92d95](https://coston2-explorer.flare.network/address/0x9Ea879f767730F308061e48Df773EfBA48A92d95)
- **MarketController**: [0x2Ed1BD05E207BfB88CbCCC9cc4649d259CB17eA7](https://coston2-explorer.flare.network/address/0x2Ed1BD05E207BfB88CbCCC9cc4649d259CB17eA7)
- **MarketFactory**: [0xE20AF7351322853B493a564c8D4E6d6c9cbFF0F6](https://coston2-explorer.flare.network/address/0xE20AF7351322853B493a564c8D4E6d6c9cbFF0F6)

### Transaction Log

1. **Contract Deployment**
   - Deployed contracts with transaction: [0x3557effdb67081a8780dbe3ef8607df20c71bdabdff33bae1ada02ebf73b9ea0](https://coston2-explorer.flare.network/tx/0x3557effdb67081a8780dbe3ef8607df20c71bdabdff33bae1ada02ebf73b9ea0)

2. **Market Creation**
   - Created market with ID: 3
   - Transaction: [0x3557effdb67081a8780dbe3ef8607df20c71bdabdff33bae1ada02ebf73b9ea0](https://coston2-explorer.flare.network/tx/0x3557effdb67081a8780dbe3ef8607df20c71bdabdff33bae1ada02ebf73b9ea0)
   - Parameters:
     - Start time: 10 seconds after creation
     - End time: 5 days after creation
     - Latitude: 35.6762° (Tokyo)
     - Longitude: 139.6503° (Tokyo)

3. **Market Locking**
   - Successfully locked market ID: 3
   - Transaction: [0x548f051b609109c939c0f91b2e1d002de828ff7bc2dc9b43fa95ce3a501d50ef](https://coston2-explorer.flare.network/tx/0x548f051b609109c939c0f91b2e1d002de828ff7bc2dc9b43fa95ce3a501d50ef)

4. **Oracle Data Processing**
   - Attempted to process fire detection data with mock proof
   - The contract requires properly formatted data from Flare's actual FDC

## Development

### Prerequisites

- Node.js v16+
- Hardhat
- Access to Flare testnet (Coston2)

### Installation

```bash
npm install
```

### Local Testing

We provide a complete workflow test script that deploys contracts, creates markets, and simulates fire detection:

```bash
npx hardhat run scripts/testWorkflow.ts --network localhost
```

### Deployment

Deploy to Coston2 testnet:

```bash
npx hardhat run scripts/deploy.ts --network coston2
```

## Testing Oracle Integration

1. Create a market:
```bash
npx hardhat run scripts/createMarket.ts --network coston2
```

2. Test with mock fire data (always returns fire detected):
```bash
npx hardhat run scripts/processOracleMock.ts --network coston2
```

For more detailed instructions, see [scripts/README.md](scripts/README.md).


## Testing with Real FDC Attestation

1. Calls our mock API endpoint at `https://flarefire-production.up.railway.app/check-fire-mock`
2. The API always returns fire detected (`fire_detected: 1`) with predefined coordinates
3. Prepares a proper FDC attestation request with this data
4. Submits the request to FDC verifiers on Coston2
5. Waits for attestation consensus (typically 3-4 minutes)
6. Constructs a valid proof with Merkle verification
7. Calls `processOracleData()` with the verified proof
8. The market is liquidated if the coordinates match

Unfortunately I was not able to get it to work in time
