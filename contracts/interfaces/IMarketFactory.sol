// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketFactory {
    function createMarketVaultsByController(
        uint256 eventStartTime,
        uint256 eventEndTime,
        uint256 triggerPrice
    )
        external
        returns (uint256 marketId, address riskVault, address hedgeVault);

    function getVaults(
        uint256 marketId
    ) external view returns (address riskVault, address hedgeVault);

    function getAsset() external view returns (address);

    function getController() external view returns (address);
}
