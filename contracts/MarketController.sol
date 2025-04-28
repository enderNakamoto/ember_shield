// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IJsonApi} from "@flarenetwork/flare-periphery-contracts/coston/IJsonApi.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston/ContractRegistry.sol";
import "./interfaces/IMarketController.sol";
import "./interfaces/IMarketFactory.sol";
import "./interfaces/IMarketVault.sol";

// All floats come multiplied by 10^6
struct DataTransportObject {
    int256 latitude;    // Multiplied by 10^6
    int256 longitude;   // Multiplied by 10^6
    uint256 fire;      // 1 or 0
}

/**
 * @title MarketController
 * @notice Controller for managing market states and handling market events
 */
contract MarketController is IMarketController, Ownable {
    // Constants and storage
    IMarketFactory private marketFactory;

    // Mappings
    mapping(uint256 => MarketState) private _marketStates;
    mapping(uint256 => MarketDetails) private _marketDetails;

    // Errors
    error DepositNotAllowed();
    error WithdrawNotAllowed();
    error InvalidStateTransition();
    error EventNotStartedYet();
    error EventNotEndedYet();
    error EventAlreadyEnded();
    error MarketAlreadyLiquidated();
    error InvalidOracleData();
    error MarketFactoryNotSet();
    error MarketFactoryAlreadySet();
    error TransferFailed();

    // Events
    event MarketStateChanged(uint256 indexed marketId, MarketState newState);

    // Modifiers
    modifier marketFactoryMustBeSet() {
        if (address(marketFactory) == address(0)) revert MarketFactoryNotSet();
        _;
    }

    modifier notLiquidated(uint256 marketId) {
        if (
            _marketStates[marketId] == MarketState.Liquidated ||
            _marketDetails[marketId].hasLiquidated
        ) {
            revert MarketAlreadyLiquidated();
        }
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Sets the MarketFactory address, can only be called once by the owner
     * @param factoryAddress The address of the MarketFactory contract
     */
    function setMarketFactory(address factoryAddress) external onlyOwner {
        if (address(marketFactory) != address(0)) {
            revert MarketFactoryAlreadySet();
        }
        require(factoryAddress != address(0), "Invalid factory address");
        marketFactory = IMarketFactory(factoryAddress);
    }

    /**
     * @notice Creates a new market with the specified parameters
     * @param eventStartTime The timestamp when the event starts
     * @param eventEndTime The timestamp when the event ends
     * @param latitude The latitude coordinate (multiplied by 10^6)
     * @param longitude The longitude coordinate (multiplied by 10^6)
     * @return marketId The ID of the created market
     * @return riskVault The address of the risk vault
     * @return hedgeVault The address of the hedge vault
     */
    function createMarket(
        uint256 eventStartTime,
        uint256 eventEndTime,
        int256 latitude,
        int256 longitude
    ) external override marketFactoryMustBeSet returns (uint256 marketId, address riskVault, address hedgeVault) {
        require(latitude != 0 && longitude != 0, "Invalid coordinates");

        // Create market vaults through factory
        (marketId, riskVault, hedgeVault) = marketFactory.createMarketVaultsByController(
            eventStartTime,
            eventEndTime,
            latitude,
            longitude
        );

        // Initialize market state
        _marketStates[marketId] = MarketState.Open;
        _marketDetails[marketId] = MarketDetails({
            eventStartTime: eventStartTime,
            eventEndTime: eventEndTime,
            latitude: latitude,
            longitude: longitude,
            hasLiquidated: false,
            liquidationTime: 0
        });

        emit MarketStateChanged(marketId, MarketState.Open);
        return (marketId, riskVault, hedgeVault);
    }

    /**
     * @notice Locks a market, preventing deposits and withdrawals, anyone can call this function
     * @param marketId The ID of the market to lock
     */
    function lockMarket(uint256 marketId) external marketFactoryMustBeSet {
        MarketState currentState = _marketStates[marketId];
        MarketDetails memory details = _marketDetails[marketId];

        // Only allow transitioning from Open to Locked
        if (currentState != MarketState.Open) {
            revert InvalidStateTransition();
        }

        // Check if the event start time has been reached
        if (block.timestamp < details.eventStartTime) {
            revert EventNotStartedYet();
        }

        // Check if the event end time has not passed
        if (block.timestamp > details.eventEndTime) {
            revert EventAlreadyEnded();
        }

        _marketStates[marketId] = MarketState.Locked;
    }

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

    /**
     * @notice Internal function to liquidate a market
     * @param marketId The ID of the market to liquidate
     */
    function _liquidateMarket(uint256 marketId) internal {
        (address riskVault, address hedgeVault) = marketFactory.getVaults(
            marketId
        );
        MarketDetails storage details = _marketDetails[marketId];

        // Get total assets in Risk Vault
        address assetAddress = marketFactory.getAsset();
        uint256 riskAssets = IERC20(assetAddress).balanceOf(riskVault);

        // Move all assets from Risk to Hedge vault if there are any
        if (riskAssets > 0) {
            try IMarketVault(riskVault).transferAssets(hedgeVault, riskAssets) {
                // Transfer succeeded
            } catch {
                // Transfer failed, but we still want to liquidate the market
                // Log a warning but don't revert
            }
        }

        // Update market state to Liquidated
        _marketStates[marketId] = MarketState.Liquidated;
        // Set the liquidation flag
        details.hasLiquidated = true;
        details.liquidationTime = block.timestamp;
    }

    // Check if deposit is allowed for a market
    function isDepositAllowed(uint256 marketId) external view returns (bool) {
        MarketState state = _marketStates[marketId];
        return state == MarketState.Open;
    }

    // Check if withdraw is allowed for a market
    function isWithdrawAllowed(uint256 marketId) external view returns (bool) {
        MarketState state = _marketStates[marketId];
        return
            state == MarketState.Open ||
            state == MarketState.Matured ||
            state == MarketState.Liquidated;
    }

    // Function to check deposit permission and revert if not allowed
    function checkDepositAllowed(uint256 marketId) external view {
        MarketState state = _marketStates[marketId];
        if (!(state == MarketState.Open)) {
            revert DepositNotAllowed();
        }
    }

    // Function to check withdraw permission and revert if not allowed
    function checkWithdrawAllowed(uint256 marketId) external view {
        MarketState state = _marketStates[marketId];
        if (!(state == MarketState.Open || state == MarketState.Matured || state == MarketState.Liquidated)) {
            revert WithdrawNotAllowed();
        }
    }

    function matureMarket(
        uint256 marketId
    ) public notLiquidated(marketId) marketFactoryMustBeSet {
        (address riskVault, address hedgeVault) = marketFactory.getVaults(
            marketId
        );
        MarketState currentState = _marketStates[marketId];
        MarketDetails memory details = _marketDetails[marketId];

        // Only allow maturation if:
        // 1. The market is locked
        // 2. The event has ended
        if (currentState != MarketState.Locked) {
            revert InvalidStateTransition();
        }

        if (block.timestamp < details.eventEndTime) {
            revert EventNotEndedYet();
        }

        // Get total assets in Hedge Vault
        uint256 hedgeAssets = IERC20(marketFactory.getAsset()).balanceOf(
            hedgeVault
        );

        // Move all assets from Hedge to Risk vault if there are any
        if (hedgeAssets > 0) {
            try
                IMarketVault(hedgeVault).transferAssets(riskVault, hedgeAssets)
            {
                // Transfer succeeded
            } catch {
                // Transfer failed, but we still want to mature the market
                // Log a warning but don't revert
            }
        }

        // Update market state to Matured
        _marketStates[marketId] = MarketState.Matured;

        emit MarketStateChanged(marketId, MarketState.Matured);
    }

    // Get vaults for a specific market
    function getMarketVaults(
        uint256 marketId
    )
        external
        view
        marketFactoryMustBeSet
        returns (address riskVault, address hedgeVault)
    {
        return marketFactory.getVaults(marketId);
    }

    /**
     * @notice Gets the market factory address
     * @return The address of the market factory
     */
    function getMarketFactory() external view returns (address) {
        return address(marketFactory);
    }

    /**
     * @notice Gets the state of a market
     * @param marketId The ID of the market
     * @return The current state of the market
     */
    function getMarketState(uint256 marketId) external view returns (MarketState) {
        return _marketStates[marketId];
    }

    /**
     * @notice Gets the liquidation state of a market
     * @param marketId The ID of the market
     * @return hasLiquidated Whether the market has been liquidated
     * @return liquidationTime The timestamp when liquidation occurred (0 if not liquidated)
     */
    function getLiquidationState(uint256 marketId) external view returns (bool hasLiquidated, uint256 liquidationTime) {
        MarketDetails memory details = _marketDetails[marketId];
        return (details.hasLiquidated, details.liquidationTime);
    }

    /**
     * @notice Checks if a market exists
     * @param marketId The ID of the market to check
     * @return Whether the market exists
     */
    function marketExists(uint256 marketId) external view returns (bool) {
        return _marketStates[marketId] != MarketState.NotSet;
    }

    function isJsonApiProofValid(IJsonApi.Proof calldata _proof) private view returns (bool) {
        return ContractRegistry.auxiliaryGetIJsonApiVerification().verifyJsonApi(_proof);
    }
}
