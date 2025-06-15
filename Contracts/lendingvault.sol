// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20 interface with decimals
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/// @notice Minimal stablecoin interface (mint/burn assumed only by vault)
interface IStablecoin {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/// @notice Minimal oracle interface
interface IPriceOracle {
    function getPrice() external view returns (uint256); // 8 decimals, price per 1 unit of collateral token
}

contract LendingVault {
    struct Vault {
        uint256 collateralAmount; // In collateral token's native decimals
        uint256 debtAmount;       // In USD (no decimals, e.g., 100 = $100)
    }

    mapping(address => Vault) public vaults;

    uint256 public constant LTV = 75; // Loan-to-value in %
    uint256 public constant LIQUIDATION_THRESHOLD = 80; // Trigger threshold %

    IERC20 public collateralToken;
    IStablecoin public stablecoin;
    IPriceOracle public oracle;
    
    uint8 public collateralDecimals;
    uint8 public stablecoinDecimals;

    // MINIMAL ADDITION: Track borrowers for liquidation.tsx
    address[] public borrowers;
    mapping(address => bool) public isBorrower;

    // MINIMAL ADDITION: Events required by liquidation.tsx
    event Borrowed(address indexed user, uint256 amountUSD, uint256 stablecoinAmount);
    event Liquidated(address indexed user, address indexed liquidator, uint256 repayAmountUSD, uint256 collateralReceived);

    constructor(address _collateral, address _stablecoin, address _oracle) {
        collateralToken = IERC20(_collateral);
        stablecoin = IStablecoin(_stablecoin);
        oracle = IPriceOracle(_oracle);
        
        // Cache decimals to save gas
        collateralDecimals = collateralToken.decimals();
        stablecoinDecimals = stablecoin.decimals();
    }

    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(collateralToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        vaults[msg.sender].collateralAmount += amount;
    }

    function borrow(uint256 borrowAmountUSD) external {
        Vault storage v = vaults[msg.sender];
        require(v.collateralAmount > 0, "No collateral");

        uint256 price = oracle.getPrice(); // 8 decimals, price per 1 unit of collateral token
        
        // Convert collateral amount to USD (no decimals)
        // collateralAmount is in collateralDecimals, price is in 8 decimals
        // Result should be in USD (no decimals)
        uint256 collateralUSD = (v.collateralAmount * price) / (10 ** collateralDecimals);
        uint256 maxLoan = (collateralUSD * LTV) / 100;

        require(v.debtAmount + borrowAmountUSD <= maxLoan, "Exceeds LTV");

        // MINIMAL ADDITION: Track borrowers
        if (!isBorrower[msg.sender] && v.debtAmount == 0) {
            borrowers.push(msg.sender);
            isBorrower[msg.sender] = true;
        }

        v.debtAmount += borrowAmountUSD;
        
        // Mint stablecoins: borrowAmountUSD is in USD (no decimals), convert to stablecoin decimals
        uint256 stablecoinAmount = borrowAmountUSD * (10 ** stablecoinDecimals);
        stablecoin.mint(msg.sender, stablecoinAmount);

        // MINIMAL ADDITION: Emit event for liquidation.tsx
        emit Borrowed(msg.sender, borrowAmountUSD, stablecoinAmount);
    }

    function repay(uint256 repayAmountUSD) external {
        Vault storage v = vaults[msg.sender];
        require(v.debtAmount > 0, "No outstanding debt");
        require(repayAmountUSD > 0 && repayAmountUSD <= v.debtAmount, "Invalid repay amount");

        // Convert USD amount to stablecoin amount
        uint256 stablecoinAmount = repayAmountUSD * (10 ** stablecoinDecimals);
        require(stablecoin.transferFrom(msg.sender, address(this), stablecoinAmount), "Transfer failed");
        stablecoin.burn(address(this), stablecoinAmount);
        v.debtAmount -= repayAmountUSD;
    }

    function liquidate(address user) external {
        require(msg.sender != user, "Cannot liquidate self");

        Vault storage v = vaults[user];
        require(v.debtAmount > 0, "No debt");

        uint256 health = _calculateHealthRatio(v) / (10** collateralDecimals);
        require(health < LIQUIDATION_THRESHOLD, "Vault is healthy");

        // Convert USD amount to stablecoin amount
        uint256 stablecoinAmount = ((v.collateralAmount * oracle.getPrice())* 105)/100;
        require(stablecoin.transferFrom(msg.sender, address(this), stablecoinAmount), "Transfer failed");

        require(collateralToken.transfer(msg.sender, v.collateralAmount), "Collateral transfer failed");

        // MINIMAL ADDITION: Emit event for liquidation.tsx
        emit Liquidated(user, msg.sender, stablecoinAmount, v.collateralAmount);
    }

    function getHealthRatio(address user) public view returns (uint256) {
        Vault memory v = vaults[user];
        if (v.debtAmount == 0) return type(uint256).max;

        uint256 price = oracle.getPrice();
        // Convert collateral to USD (no decimals)
        uint256 collateralUSD = (v.collateralAmount * price) / (10 ** (collateralDecimals));

        return (collateralUSD * 100) / v.debtAmount;
    }

    function _calculateHealthRatio(Vault memory v) internal view returns (uint256) {
        if (v.debtAmount == 0) return type(uint256).max;

        uint256 price = oracle.getPrice();
        // Convert collateral to USD (no decimals)
        uint256 collateralUSD = (v.collateralAmount * price) / (10 ** (collateralDecimals));

        return (collateralUSD * 100) / v.debtAmount;
    }

    // Helper function to get maximum borrowable amount in USD for a user
    function getMaxBorrowAmount(address user) external view returns (uint256) {
        Vault memory v = vaults[user];
        if (v.collateralAmount == 0) return 0;

        uint256 price = oracle.getPrice();
        uint256 collateralUSD = (v.collateralAmount * price) / (10 ** (collateralDecimals ));
        uint256 maxLoan = (collateralUSD * LTV) / 100;
        
        return maxLoan > v.debtAmount ? maxLoan - v.debtAmount : 0;
    }

    // Helper function to get collateral value in USD
    function getCollateralValueUSD(address user) external view returns (uint256) {
        Vault memory v = vaults[user];
        if (v.collateralAmount == 0) return 0;

        uint256 price = oracle.getPrice();
        return (v.collateralAmount * price) / (10 ** (collateralDecimals));
    }

    // MINIMAL ADDITIONS: Functions required by liquidation.tsx
    function getAllBorrowers() external view returns (address[] memory) {
        return borrowers;
    }

    function getBorrowerCount() external view returns (uint256) {
        return borrowers.length;
    }

    function getBorrowerDetails(address user) external view returns (
        uint256 collateralAmount,
        uint256 debtAmount,
        uint256 healthRatio,
        uint256 collateralValueUSD
    ) {
        Vault memory v = vaults[user];
        
        // Inline the collateral value calculation to avoid forward reference
        uint256 collateralValue = 0;
        if (v.collateralAmount > 0) {
            uint256 price = oracle.getPrice();
            collateralValue = (v.collateralAmount * price) / (10 ** (collateralDecimals));
        }
        
        return (
            v.collateralAmount,
            v.debtAmount,
            getHealthRatio(user),
            collateralValue
        );
    }
}