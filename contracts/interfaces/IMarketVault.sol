// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketVault {
    function transferAssets(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function approveAssets(
        address spender,
        uint256 amount
    ) external returns (bool);

    function getMarketId() external view returns (uint256);

    function getCounterpartVault() external view returns (address);
}
