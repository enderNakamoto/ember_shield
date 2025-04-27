// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../abstract/BaseVault.sol";

/**
 * @title RiskVault
 * @notice Vault for holding risk positions in a market
 */
contract RiskVault is BaseVault {
    /**
     * @dev Constructor
     * @param asset_ The underlying asset
     * @param controller_ The market controller address
     * @param marketId_ The ID of the market this vault belongs to
     */
    constructor(
        IERC20 asset_,
        address controller_,
        uint256 marketId_
    )
        BaseVault(
            asset_,
            controller_,
            marketId_,
            string.concat("Risk Vault ", Strings.toString(marketId_)),
            string.concat("rVault", Strings.toString(marketId_))
        )
    {}
}
