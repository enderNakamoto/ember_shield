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