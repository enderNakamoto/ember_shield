# Ember Shield

A decentralized fire insurance platform that uses smart contracts, deployed on the Flare network. The platform leverages Flare's Data Contract (FDC) and oracle capabilities to provide a trustless fire insurance solution.

## Overview

Ember Shield creates fire insurance markets where users can deposit funds to either:
1. Hedge against the risk of fire (receive payout if a fire occurs)
2. Earn yield by taking on risk (receive premium if no fire occurs)

The platform uses Flare's decentralized oracle system to detect fires in specific locations and automatically trigger liquidations when fires are detected.

## Key Components

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

### Flare Oracle Integration

The system uses Flare's FDC (Flare Data Contract) to fetch and validate external data:

1. FDC queries our API for fire detection data
2. Oracle validators verify the data and provide proofs
3. Smart contracts validate these proofs and trigger liquidation if a fire is detected

## Workflow Without FDC Attestation

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

## Testing Workflow

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