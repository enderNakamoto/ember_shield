// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketController {
    enum MarketState {
        NotSet, // Market state is not set
        Open, // Market is open for deposits and withdrawals
        Locked, // Market is in progress, no deposits or withdrawals allowed
        Matured, // Market has matured, deposits and withdrawals allowed
        Liquidated // Market has been liquidated, deposits and withdrawals allowed
    }

    struct MarketDetails {
        uint256 eventStartTime; // Timestamp when the event starts
        uint256 eventEndTime; // Timestamp when the event ends
        int256 latitude; // Latitude of the covered house
        int256 longitude; // Longitude of the covered house
        bool hasLiquidated; // Flag to track if market has ever been liquidated
        uint256 liquidationTime; // Timestamp when the liquidation occurred (default if not)
    }

    function createMarket(
        uint256 eventStartTime,
        uint256 eventEndTime,
        int256 latitude,
        int256 longitude
    ) external returns (uint256 marketId, address riskVault, address hedgeVault);

    function isDepositAllowed(uint256 marketId) external view returns (bool);

    function isWithdrawAllowed(uint256 marketId) external view returns (bool);

    function checkDepositAllowed(uint256 marketId) external view;

    function checkWithdrawAllowed(uint256 marketId) external view;

    function setMarketFactory(address factoryAddress) external;

    function getMarketFactory() external view returns (address);

    function getMarketState(uint256 marketId) external view returns (MarketState);

    function getLiquidationState(uint256 marketId) external view returns (bool hasLiquidated, uint256 liquidationTime);

    function marketExists(uint256 marketId) external view returns (bool);
}
