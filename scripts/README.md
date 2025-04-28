# Oracle Testing Scripts

This directory contains scripts for deploying, creating, and testing fire insurance markets using the Flare Data Contract (FDC) API.

## Prerequisites

1. Set up environment variables in `.env`:
```
JQ_VERIFIER_URL_TESTNET=https://jq-verifier-test.flare.rocks
JQ_VERIFIER_API_KEY_TESTNET=your-api-key-here
COSTON2_DA_LAYER_URL=https://coston2-data-api.flare.network/
```

2. Install dependencies:
```bash
npm install
```

## Deployment Workflow

1. Deploy the contracts:
```bash
npx hardhat run scripts/deploy.ts --network coston2
```
This will deploy:
- MockERC20 token
- MarketController
- MarketFactory

The addresses will be saved to `scripts/config/addresses.json`.

2. Create a market:
```bash
npx hardhat run scripts/createMarket.ts --network coston2
```
This will:
- Create a market with Tokyo coordinates
- Configure the market to start in 2 days and end in 30 days
- Save the market ID to `scripts/config/market.json`

## Oracle Testing

### Option 1: Test with the real fire detection API

```bash
npx hardhat run scripts/processOracle.ts --network coston2
```
This will:
- Query the fire detection API at `flarefire-production.up.railway.app/check-fire`
- Process the oracle data through FDC
- Update the market state based on actual fire data

### Option 2: Test with mock fire detection (always fire=1)

```bash
npx hardhat run scripts/processOracleMock.ts --network coston2
```
This will:
- Use the mock endpoint that always returns `fire_detected=1`
- Liquidate the market (since fire is detected)
- Show the market state after liquidation

## Mock API Endpoints

The following endpoints are available in our mock API:

1. `https://flarefire-production.up.railway.app/health` - Returns health status
2. `https://flarefire-production.up.railway.app/check-fire` - Checks for fire at a real location
3. `https://flarefire-production.up.railway.app/check-fire-mock` - Always returns fire detected at specified coordinates

## Market Testing Flow

For complete market testing:

1. Deploy contracts
2. Create a market
3. Lock the market (after event start time)
4. Test with the mock oracle (to force liquidation)
5. Verify market was liquidated correctly

## Troubleshooting

- If you encounter errors with contract addresses, update them in `scripts/config.ts`
- For FDC errors, verify your API keys and environment variables
- To test on different networks, update the `--network` parameter accordingly 