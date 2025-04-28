// Helper functions for FDC (Flare Data Contract) interactions
import axios from "axios";

/**
 * Sleep function to wait between API calls
 * @param ms Milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Base function to prepare an attestation request
 * @param url The URL to send the request to
 * @param apiKey The API key for authentication
 * @param attestationType The type of attestation (e.g., "IJsonApi")
 * @param sourceId The source ID for the attestation
 * @param requestBody The request body with URL, jq filter, and ABI signature
 * @returns The response from the attestation request
 */
export async function prepareAttestationRequestBase(
  url: string,
  apiKey: string,
  attestationType: string,
  sourceId: string,
  requestBody: any
): Promise<any> {
  console.log("Preparing attestation request...");
  console.log("URL:", url);
  
  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      }
    });
    
    console.log("Attestation request prepared successfully");
    return response.data;
  } catch (error: any) {
    console.error("Error preparing attestation request:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

/**
 * Function to submit an attestation request to FDC
 * @param abiEncodedRequest The ABI-encoded request to submit
 * @returns The round ID of the submitted request
 */
export async function submitAttestationRequest(
  abiEncodedRequest: string
): Promise<number> {
  console.log("Submitting attestation request to FDC...");
  
  // In a real implementation, this would interact with the FDC contract
  // For this example, we're mocking the response
  const roundId = Math.floor(Math.random() * 1000) + 1;
  
  console.log("Request submitted successfully");
  console.log("Round ID:", roundId);
  
  // Wait for 10 seconds to simulate processing time
  console.log("Waiting for round to finalize...");
  await sleep(10000);
  console.log("Round finalized");
  
  return roundId;
}

/**
 * Function to retrieve data and proof from a DA Layer server
 * @param url The URL of the DA Layer server
 * @param abiEncodedRequest The ABI-encoded request
 * @param roundId The round ID to retrieve data for
 * @returns The proof and response data
 */
export async function retrieveDataAndProofBase(
  url: string,
  abiEncodedRequest: string,
  roundId: number
): Promise<{ proof: string; response_hex: string }> {
  console.log("Retrieving data and proof from DA Layer...");
  console.log("URL:", url);
  console.log("Round ID:", roundId);
  
  try {
    // In a real implementation, this would fetch from the DA Layer
    // For this example, we're mocking the response
    const mockProof = "0x" + "1".repeat(64);
    const mockResponseHex = "0x" + "2".repeat(64);
    
    console.log("Data and proof retrieved successfully");
    
    return {
      proof: mockProof,
      response_hex: mockResponseHex
    };
  } catch (error: any) {
    console.error("Error retrieving data and proof:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
} 