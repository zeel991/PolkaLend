// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20 interface
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Minimal stablecoin interface (mint/burn assumed only by vault)
interface IStablecoin {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Minimal oracle interface
interface IPriceOracle {
    function getPrice() external view returns (uint256); // 8 decimals
}

contract LendingVault {
    struct Vault {
        uint256 collateralAmount;
        uint256 debtAmount;
    }

    mapping(address => Vault) public vaults;

    uint256 public constant LTV = 75; // Loan-to-value in %
    uint256 public constant LIQUIDATION_THRESHOLD = 80; // Trigger threshold %

    IERC20 public collateralToken;
    IStablecoin public stablecoin;
    IPriceOracle public oracle;

    constructor(address _collateral, address _stablecoin, address _oracle) {
        collateralToken = IERC20(_collateral);
        stablecoin = IStablecoin(_stablecoin);
        oracle = IPriceOracle(_oracle);
    }

    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(collateralToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        vaults[msg.sender].collateralAmount += amount;
    }

    function borrow(uint256 borrowAmount) external {
        Vault storage v = vaults[msg.sender];
        require(v.collateralAmount > 0, "No collateral");

        uint256 price = oracle.getPrice(); // 8 decimals
        uint256 collateralUSD = (v.collateralAmount * price) / 1e8;
        uint256 maxLoan = (collateralUSD * LTV) / 100;

        require(v.debtAmount + borrowAmount <= maxLoan, "Exceeds LTV");

        v.debtAmount += borrowAmount;
        stablecoin.mint(msg.sender, borrowAmount * 1e18);
    }

    function repay(uint256 repayAmount) external {
        Vault storage v = vaults[msg.sender];
        require(v.debtAmount > 0, "No outstanding debt");
        require(repayAmount > 0 && repayAmount <= v.debtAmount, "Invalid repay amount");

        require(stablecoin.transferFrom(msg.sender, address(this), repayAmount * 1e18), "Transfer failed");
        stablecoin.burn(address(this), repayAmount * 1e18);
        v.debtAmount -= repayAmount;
    }

    function liquidate(address user, uint256 repayAmount) external {
        require(msg.sender != user, "Cannot liquidate self");

        Vault storage v = vaults[user];
        require(v.debtAmount > 0, "No debt");

        uint256 health = _calculateHealthRatio(v);
        require(health < LIQUIDATION_THRESHOLD, "Vault is healthy");
        require(repayAmount > 0 && repayAmount <= v.debtAmount, "Invalid repay amount");

        require(stablecoin.transferFrom(msg.sender, address(this), repayAmount * 1e18), "Transfer failed");
        stablecoin.burn(address(this), repayAmount * 1e18);

        uint256 price = oracle.getPrice(); // 8 decimals
        uint256 discountedCollateralUSD = (repayAmount * 105) / 100;
        uint256 collateralToGive = (discountedCollateralUSD * 1e8) / price;

        require(collateralToGive <= v.collateralAmount, "Not enough collateral");

        v.debtAmount -= repayAmount;
        v.collateralAmount -= collateralToGive;

        require(collateralToken.transfer(msg.sender, collateralToGive), "Collateral transfer failed");
    }

    function getHealthRatio(address user) public view returns (uint256) {
        Vault memory v = vaults[user];
        if (v.debtAmount == 0) return type(uint256).max;

        uint256 price = oracle.getPrice();
        uint256 collateralUSD = (v.collateralAmount * price) / 1e8;

        return (collateralUSD * 100) / v.debtAmount;
    }

    function _calculateHealthRatio(Vault memory v) internal view returns (uint256) {
        if (v.debtAmount == 0) return type(uint256).max;

        uint256 price = oracle.getPrice();
        uint256 collateralUSD = (v.collateralAmount * price) / 1e8;

        return (collateralUSD * 100) / v.debtAmount;
    }
}
