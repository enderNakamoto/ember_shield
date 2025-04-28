import { ethers } from "hardhat";
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

async function prepareMockUrl(): Promise<string> {
  // Using the mock endpoint that always returns fire_detected = 1
  return `https://flarefire-production.up.railway.app/check-fire-mock`;
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

async function createMockProof() {
  // For testing, create a mock proof with the exact data we want
  // This simulates what we'd get from our mock API
  const mockData = {
    latitude: 37772760,
    longitude: -122454362,
    fire: 1
  };
  
  console.log("Creating mock proof with data:", mockData, "\n");
  
  // In a real implementation, this would be properly encoded
  // For our mock, we'll just use a simple hex string
  return {
    proof: "0x" + "1".repeat(64),
    response_hex: "0x" + "2".repeat(64) // This would actually contain encoded mockData
  };
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
    console.log("Preparing to call processOracleData...\n");
    
    // Retry mechanism for processing oracle data
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const transaction = await controller.processOracleData(id, {
          merkleProof: proof.proof,
          data: proof.response_hex,
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
    // Get the market details
    const market = await getMarket(controller, marketId);
    
    // Prepare the mock API URL
    const apiUrl = await prepareMockUrl();
    console.log("Mock API URL:", apiUrl, "\n");

    // Prepare the attestation request
    const data = await prepareAttestationRequest(
      apiUrl,
      postprocessJq,
      abiSignature,
    );
    console.log("Data:", data, "\n");

    // Submit the request and get proof
    const abiEncodedRequest = data.abiEncodedRequest;
    const roundId = await submitAttestationRequest(abiEncodedRequest);
    
    // For testing, we can either:
    // 1. Get a proof from the mock endpoint
    // const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);
    
    // 2. Or create a mock proof directly
    const proof = await createMockProof();

    // Process the oracle data with our proof
    await processOracleData(controller, marketId, proof);
    
    console.log("Oracle data processing complete!");
    console.log("Market should now be in LIQUIDATED state");
    
    // Check the market state after liquidation
    const marketState = await controller.getMarketState(marketId);
    console.log("Market state:", marketState.toString());
    
    const liquidationState = await controller.getLiquidationState(marketId);
    console.log("Liquidation state:", liquidationState);
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