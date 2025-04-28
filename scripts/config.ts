// Default configuration values
export const config = {
  // Contract addresses (to be set after deployment)
  marketController: "YOUR_MARKET_CONTROLLER_ADDRESS",
  marketFactory: "YOUR_MARKET_FACTORY_ADDRESS",
  mockERC20: "YOUR_MOCK_ERC20_ADDRESS",
  
  // Market details
  marketId: 0,
  
  // API endpoints
  apiUrl: "https://flarefire-production.up.railway.app",
  mockApiUrl: "https://flarefire-production.up.railway.app/check-fire-mock",
  
  // Flare JSON API details
  jqVerifierUrl: "https://jq-verifier-test.flare.rocks",
  
  // FDC signature for DataTransportObject
  abiSignature: `{
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
  }`
}; 