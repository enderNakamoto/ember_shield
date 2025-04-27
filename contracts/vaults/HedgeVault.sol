// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../abstract/BaseVault.sol";

/**
 * @title HedgeVault
 * @notice Vault for holding hedge positions in a market
 */
contract HedgeVault is BaseVault {
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
            string.concat("Hedge Vault ", Strings.toString(marketId_)),
            string.concat("hVault", Strings.toString(marketId_))
        )
    {}
}
