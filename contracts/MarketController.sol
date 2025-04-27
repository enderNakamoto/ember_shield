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
    int256 latitude;
    int256 longitude;
    uint256 fire;
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

    // Events
    event MarketStateChanged(uint256 indexed marketId, MarketState state);
    event MarketLiquidated(uint256 indexed marketId);
    event MarketMatured(uint256 indexed marketId);
    event MarketCreated(
        uint256 indexed marketId,
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    );
    event MarketFactorySet(address indexed marketFactory);
    event OracleDataProcessed(
        uint256 indexed marketId,
        uint256 price,
        uint256 timestamp
    );
    // Event for assets transfer failure
    event AssetsTransferFailed(uint256 indexed marketId);
    // Event for assets transfer failure
    event AssetsTransferSucceeded(uint256 indexed marketId);

    // Errors
    error DepositNotAllowed(uint256 marketId, MarketState state);
    error WithdrawNotAllowed(uint256 marketId, MarketState state);
    error InvalidStateTransition(
        uint256 marketId,
        MarketState currentState,
        MarketState newState
    );
    error EventNotStartedYet(
        uint256 marketId,
        uint256 currentTime,
        uint256 startTime
    );
    error EventNotEndedYet(
        uint256 marketId,
        uint256 currentTime,
        uint256 endTime
    );
    error EventAlreadyEnded(
        uint256 marketId,
        uint256 currentTime,
        uint256 endTime
    );
    error MarketAlreadyLiquidated(uint256 marketId);
    error PriceAboveTrigger(
        uint256 marketId,
        uint256 currentPrice,
        uint256 triggerPrice
    );
    error InvalidOracleData(uint256 marketId);
    error MarketFactoryNotSet();
    error MarketFactoryAlreadySet();
    error TransferFailed();

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
            revert MarketAlreadyLiquidated(marketId);
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
        emit MarketFactorySet(factoryAddress);
    }

    function notifyMarketCreated(
        uint256 marketId,
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    ) external {
        // Only MarketFactory should be able to call this
        require(
            msg.sender == address(marketFactory),
            "Only MarketFactory can call this"
        );
        _marketCreated(marketId, eventStartTime, eventEndTime, triggerPrice);
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
            revert InvalidStateTransition(
                marketId,
                currentState,
                MarketState.Locked
            );
        }

        // Check if the event start time has been reached
        if (block.timestamp < details.eventStartTime) {
            revert EventNotStartedYet(
                marketId,
                block.timestamp,
                details.eventStartTime
            );
        }

        // Check if the event end time has not passed
        if (block.timestamp > details.eventEndTime) {
            revert EventAlreadyEnded(
                marketId,
                block.timestamp,
                details.eventEndTime
            );
        }

        _marketStates[marketId] = MarketState.Locked;
        emit MarketStateChanged(marketId, MarketState.Locked);
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

        emit OracleDataProcessed(marketId, currentPrice, timestamp);
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
                emit AssetsTransferSucceeded(marketId);
            } catch {
                // Transfer failed, but we still want to liquidate the market
                // Log a warning but don't revert
                emit AssetsTransferFailed(marketId);
            }
        }

        // Update market state to Liquidated
        _marketStates[marketId] = MarketState.Liquidated;
        // Set the liquidation flag
        details.hasLiquidated = true;
        details.liquidationTime = block.timestamp;

        emit MarketStateChanged(marketId, MarketState.Liquidated);
        emit MarketLiquidated(marketId);
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
            revert DepositNotAllowed(marketId, state);
        }
    }

    // Function to check withdraw permission and revert if not allowed
    function checkWithdrawAllowed(uint256 marketId) external view {
        MarketState state = _marketStates[marketId];
        if (
            !(state == MarketState.Open ||
                state == MarketState.Matured ||
                state == MarketState.Liquidated)
        ) {
            revert WithdrawNotAllowed(marketId, state);
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
            revert InvalidStateTransition(
                marketId,
                currentState,
                MarketState.Matured
            );
        }

        if (block.timestamp < details.eventEndTime) {
            revert EventNotEndedYet(
                marketId,
                block.timestamp,
                details.eventEndTime
            );
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
                emit AssetsTransferSucceeded(marketId);
            } catch {
                // Transfer failed, but we still want to mature the market
                // Log a warning but don't revert
                emit AssetsTransferFailed(marketId);
            }
        }

        // Update market state to Matured
        _marketStates[marketId] = MarketState.Matured;
        emit MarketStateChanged(marketId, MarketState.Matured);
        emit MarketMatured(marketId);
    }

    // Internal implementation of marketCreated
    function _marketCreated(
        uint256 marketId,
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    ) internal {
        // Validate parameters
        require(
            eventStartTime > block.timestamp,
            "Event start time must be in the future"
        );
        require(
            eventEndTime > eventStartTime,
            "Event end time must be after start time"
        );
        require(triggerPrice > 0, "Trigger price must be greater than zero");

        // Store details information
        _marketDetails[marketId] = MarketDetails({
            eventStartTime: eventStartTime,
            eventEndTime: eventEndTime,
            triggerPrice: triggerPrice,
            hasLiquidated: false,
            liquidationTime: 0
        });

        // Set initial state to Open
        _marketStates[marketId] = MarketState.Open;
        emit MarketStateChanged(marketId, MarketState.Open);
        emit MarketCreated(
            marketId,
            eventStartTime,
            eventEndTime,
            triggerPrice
        );
    }

    // For backward compatibility with existing tests
    function marketCreated(
        uint256 marketId,
        uint256 eventStartTime,
        uint256 eventEndTime
    ) external {
        // Only MarketFactory should be able to call this
        require(
            msg.sender == address(marketFactory),
            "Only MarketFactory can call this"
        );

        // Use a default trigger price of 1000 (arbitrary value)
        uint256 defaultTriggerPrice = 1000;
        _marketCreated(
            marketId,
            eventStartTime,
            eventEndTime,
            defaultTriggerPrice
        );
    }

    // Getter function for market timing information
    function getMarketTiming(
        uint256 marketId
    ) external view returns (uint256 startTime, uint256 endTime) {
        MarketDetails memory details = _marketDetails[marketId];
        return (details.eventStartTime, details.eventEndTime);
    }

    // Getter function for market trigger price
    function getMarketTriggerPrice(
        uint256 marketId
    ) external view returns (uint256) {
        return _marketDetails[marketId].triggerPrice;
    }

    // Create a market with custom parameters through Controller
    function createMarket(
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    )
        external
        marketFactoryMustBeSet
        returns (uint256 marketId, address riskVault, address hedgeVault)
    {
        return
            marketFactory.createMarketVaultsByController(
                eventStartTime,
                eventEndTime,
                triggerPrice
            );
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

    // Get market factory address
    function getMarketFactory() external view returns (address) {
        return address(marketFactory);
    }

    // Get current market state
    function getMarketState(
        uint256 marketId
    ) external view returns (MarketState) {
        return _marketStates[marketId];
    }

    // Get liquidation info
    function getLiquidationState(
        uint256 marketId
    ) external view returns (bool hasLiquidated, uint256 liquidationTime) {
        return (
            _marketDetails[marketId].hasLiquidated,
            _marketDetails[marketId].liquidationTime
        );
    }

    // Check if the market has been initialized by checking non-default values
    function marketExists(uint256 marketId) external view returns (bool) {
        return _marketDetails[marketId].eventEndTime != 0;
    }

    function isJsonApiProofValid(IJsonApi.Proof calldata _proof) private view returns (bool) {
        return ContractRegistry.auxiliaryGetIJsonApiVerification().verifyJsonApi(_proof);
    }
}
