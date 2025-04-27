// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMarketFactory.sol";
import "./interfaces/IMarketController.sol";
import "./vaults/RiskVault.sol";
import "./vaults/HedgeVault.sol";

/**
 * @title MarketFactory
 * @notice Factory for creating and managing market vaults
 */
contract MarketFactory is IMarketFactory, Ownable {
    // Constants and storage
    address private immutable controller;
    IERC20 private immutable asset;
    uint256 private nextMarketId;

    struct MarketVaults {
        address riskVault;
        address hedgeVault;
    }

    // Mapping from market ID to market vaults
    mapping(uint256 => MarketVaults) private _marketVaults;

    // Events
    event MarketVaultsCreated(
        uint256 indexed marketId,
        address indexed riskVault,
        address indexed hedgeVault,
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    );

    // Errors
    error OnlyController();
    error VaultsNotFound();
    error InvalidTimeParameters();
    error InvalidTriggerPrice();

    // Modifiers
    modifier onlyController() {
        if (msg.sender != controller) revert OnlyController();
        _;
    }

    /**
     * @dev Constructor
     * @param controller_ The market controller address
     * @param asset_ The underlying asset address
     */
    constructor(address controller_, address asset_) Ownable(msg.sender) {
        require(controller_ != address(0), "Invalid controller address");
        require(asset_ != address(0), "Invalid asset address");
        controller = controller_;
        asset = IERC20(asset_);
        nextMarketId = 1;
    }

    /**
     * @notice Creates market vaults with timing parameters and trigger price, invoked by controller
     * @param eventStartTime The timestamp when the event starts
     * @param eventEndTime The timestamp when the event ends
     * @param triggerPrice The price at which liquidation is triggered
     * @return marketId The ID of the created market
     * @return riskVault The address of the risk vault
     * @return hedgeVault The address of the hedge vault
     */
    function createMarketVaultsByController(
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    )
        external
        override
        onlyController
        returns (uint256 marketId, address riskVault, address hedgeVault)
    {
        // Validate parameters
        if (
            eventStartTime <= block.timestamp || eventEndTime <= eventStartTime
        ) {
            revert InvalidTimeParameters();
        }
        if (triggerPrice == 0) {
            revert InvalidTriggerPrice();
        }

        // Assign market ID
        marketId = nextMarketId++;

        // Deploy Hedge vault first
        HedgeVault hedge = new HedgeVault(asset, controller, marketId);
        hedgeVault = address(hedge);

        // Deploy Risk vault
        RiskVault risk = new RiskVault(asset, controller, marketId);
        riskVault = address(risk);

        // Set counterpart relationships
        hedge.setCounterpartVault(riskVault);
        risk.setCounterpartVault(hedgeVault);

        // Setup asset approvals
        hedge.approveAssets(riskVault, type(uint256).max);
        risk.approveAssets(hedgeVault, type(uint256).max);

        // Store vault addresses
        _marketVaults[marketId] = MarketVaults({
            riskVault: riskVault,
            hedgeVault: hedgeVault
        });

        // Notify the controller about the new market with timing parameters
        try
            IMarketController(controller).notifyMarketCreated(
                marketId,
                eventStartTime,
                eventEndTime,
                triggerPrice
            )
        {} catch {
            // We don't want to revert the market creation if the controller notification fails
            // But we log it as an event
            emit ControllerNotificationFailed(marketId);
        }

        emit MarketVaultsCreated(
            marketId,
            riskVault,
            hedgeVault,
            eventStartTime,
            eventEndTime,
            triggerPrice
        );

        return (marketId, riskVault, hedgeVault);
    }

    /**
     * @notice Gets the vaults for a market
     * @param marketId The ID of the market
     * @return riskVault The address of the risk vault
     * @return hedgeVault The address of the hedge vault
     */
    function getVaults(
        uint256 marketId
    ) external view override returns (address riskVault, address hedgeVault) {
        MarketVaults memory vaults = _marketVaults[marketId];
        if (vaults.riskVault == address(0) || vaults.hedgeVault == address(0)) {
            revert VaultsNotFound();
        }
        return (vaults.riskVault, vaults.hedgeVault);
    }

    /**
     * @notice Gets the asset address
     * @return The address of the asset
     */
    function getAsset() external view override returns (address) {
        return address(asset);
    }

    /**
     * @notice Gets the controller address
     * @return The address of the asset
     */
    function getController() external view override returns (address) {
        return controller;
    }

    // Event for controller notification failure
    event ControllerNotificationFailed(uint256 indexed marketId);
}
