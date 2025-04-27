// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IMarketController.sol";
import "../interfaces/IMarketVault.sol";

/**
 * @title BaseVault
 * @notice Base implementation for market vaults with common functionality
 * @dev Inherits from ERC4626 to implement the tokenized vault standard
 */
abstract contract BaseVault is ERC4626, IMarketVault, Ownable {
    // Constants and immutables
    address public immutable controller;
    uint256 public immutable marketId;
    address private _counterpartVault;

    // Events
    event CounterpartVaultSet(address indexed counterpartVault);
    event AssetsTransferred(address indexed recipient, uint256 amount);

    // Errors
    error OnlyFactory();
    error OnlyController();
    error CounterpartAlreadySet();
    error ZeroAmount();
    error TransferFailed();

    // Modifiers
    modifier onlyFactory() {
        if (msg.sender != IMarketController(controller).getMarketFactory())
            revert OnlyFactory();
        _;
    }

    modifier onlyController() {
        if (msg.sender != controller) revert OnlyController();
        _;
    }

    /**
     * @dev Constructor
     * @param asset_ The underlying asset
     * @param controller_ The market controller address
     * @param marketId_ The ID of the market this vault belongs to
     * @param name_ The name of the vault token
     * @param symbol_ The symbol of the vault token
     */
    constructor(
        IERC20 asset_,
        address controller_,
        uint256 marketId_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(msg.sender) {
        require(controller_ != address(0), "Invalid controller address");
        controller = controller_;
        marketId = marketId_;
    }

    /**
     * @notice Sets the counterpart vault address, called by market factory
     * @param counterpartVault_ The address of the counterpart vault
     */
    function setCounterpartVault(
        address counterpartVault_
    ) external onlyFactory {
        if (_counterpartVault != address(0)) revert CounterpartAlreadySet();
        if (counterpartVault_ == address(0))
            revert("Invalid counterpart address");
        _counterpartVault = counterpartVault_;
        emit CounterpartVaultSet(counterpartVault_);
    }

    /**
     * @notice Approves assets for a spender, called by market factory
     * @param spender The spender address
     * @param amount The amount to approve
     * @return success Whether the approval was successful
     */
    function approveAssets(
        address spender,
        uint256 amount
    ) external override onlyFactory returns (bool) {
        if (!IERC20(asset()).approve(spender, amount))
            revert("Approval failed");
        return true;
    }

    /**
     * @notice Transfers assets to a recipient, called by market controller
     * @param recipient The recipient address
     * @param amount The amount to transfer
     * @return success Whether the transfer was successful
     */
    function transferAssets(
        address recipient,
        uint256 amount
    ) external override onlyController returns (bool) {
        if (amount == 0) revert ZeroAmount();
        if (!IERC20(asset()).transfer(recipient, amount))
            revert TransferFailed();
        emit AssetsTransferred(recipient, amount);
        return true;
    }

    /**
     * @notice Gets the counterpart vault address
     * @return The counterpart vault address
     */
    function getCounterpartVault() external view override returns (address) {
        return _counterpartVault;
    }

    /**
     * @notice Gets the market ID
     * @return The market ID
     */
    function getMarketId() external view override returns (uint256) {
        return marketId;
    }

    // Override ERC4626 operations to enforce market state checks

    function deposit(
        uint256 assets,
        address receiver
    ) public virtual override returns (uint256) {
        // Check with controller if deposit is allowed
        IMarketController(controller).checkDepositAllowed(marketId);
        return super.deposit(assets, receiver);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public virtual override returns (uint256) {
        // Check with controller if deposit is allowed
        IMarketController(controller).checkDepositAllowed(marketId);
        return super.mint(shares, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public virtual override returns (uint256) {
        // Check with controller if withdraw is allowed
        IMarketController(controller).checkWithdrawAllowed(marketId);
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public virtual override returns (uint256) {
        // Check with controller if withdraw is allowed
        IMarketController(controller).checkWithdrawAllowed(marketId);
        return super.redeem(shares, receiver, owner_);
    }
}
