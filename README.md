# PolkaLend
# Lending Vault Demo Steps

## Phase 1: Contract Deployment

### Step 1: Deploy CollateralToken
```solidity
// Deploy CollateralToken.sol first
// Constructor parameters: none
// This mints 1000 DOT tokens to the deployer
```

### Step 2: Deploy MockPriceOracle
```solidity
// Deploy MockPriceOracle.sol
// Constructor parameter: initialPrice = 500000000 (represents $5.00 with 8 decimals)
```

### Step 3: Deploy MyStablecoin
```solidity
// Deploy MyStablecoin.sol
// Constructor parameter: initialOwner = your_wallet_address
```

### Step 4: Deploy LendingVault
```solidity
// Deploy LendingVault.sol
// Constructor parameters:
// _collateral: CollateralToken contract address
// _stablecoin: MyStablecoin contract address
// _oracle: MockPriceOracle contract address
```

### Step 5: Prepare Tokens for Demo
```solidity
// BEFORE transferring ownership, mint some MSC tokens for liquidation demo
// Mint tokens to Account B (future liquidator)
MyStablecoin.mint(AccountB_address, 500 * 1e18)  // 500 MSC tokens

```

## Phase 2: Setup Test Accounts

### Step 6: Prepare Test Accounts
- **Account A (Borrower)**: Main demonstration account
- **Account B (Liquidator)**: For liquidation demonstration
- **Account C (Oracle Owner)**: For price updates

### Step 7: Distribute Collateral Tokens
```solidity
// From deployer account (has 1000 DOT), transfer:
// - 200 DOT to Account A
// - 100 DOT to Account B
// Use CollateralToken.transfer(recipient, amount)
```

## Phase 3: Core Functionality Demo

### Step 8: Deposit Collateral (Account A)
```solidity


// 1. Deposit 100 DOT as collateral
LendingVault.depositCollateral(100)

// Expected: CollateralDeposited event emitted
// Verify: vaults[AccountA].collateralAmount = 100
```

### Step 9: Borrow Stablecoins (Account A)
```solidity
// Calculate max borrowable amount:
// Collateral: 100 DOT
// Price: $5.00 per DOT
// Collateral Value: 100 * $5 = $500
// Max Loan (75% LTV): $500 * 0.75 = $375

// Borrow $300 worth of stablecoins
LendingVault.borrow(300)

// Expected: 
// - Borrowed event emitted
// - Account A receives 300 * 1e18 MSC tokens
// - vaults[AccountA].debtAmount = 300
```

### Step 10: Check Health Ratio
```solidity
// Check borrower's health
LendingVault.getHealthRatio(AccountA_address)

// Expected result: 
// (100 DOT * $5) / $300 debt * 100 = 166.67%
// This is above 80% liquidation threshold (healthy)
```

## Phase 4: Liquidation Demo

### Step 11: Simulate Price Drop (Oracle Owner)
```solidity
// Reduce DOT price to trigger liquidation
// New price: $2.00 per DOT (40% drop)
MockPriceOracle.updatePrice(200000000)  // $2.00 with 8 decimals
```

### Step 12: Check Health After Price Drop
```solidity
LendingVault.getHealthRatio(AccountA_address)

// New calculation:
// (100 DOT * $2) / $300 debt * 100 = 66.67%
// This is below 80% liquidation threshold (unhealthy)
```

### Step 13: Prepare Liquidator (Account B)
```solidity
// Account B should already have MSC tokens from Step 5
// Check Account B's MSC balance:
MyStablecoin.balanceOf(AccountB_address)  // Should show 500 * 1e18

// Account B approves vault to spend MSC for liquidation
MyStablecoin.approve(LendingVault_address, 300 * 1e18)
```

### Step 14: Execute Liquidation (Account B)
```solidity
// Account B liquidates Account A's position
LendingVault.liquidate(AccountA_address)

// Expected results:
// - Liquidated event emitted
// - Account B's 300 MSC tokens burned
// - Account B receives 100 DOT tokens
// - Account A's vault is deleted
// - Account A loses all collateral but debt is cleared
```

## Phase 5: Verification and Analysis

### Step 15: Verify Final State
```solidity
// Check that Account A's vault is cleared
LendingVault.vaults(AccountA_address)
// Should return: collateralAmount = 0, debtAmount = 0

// Check Account B received collateral
CollateralToken.balanceOf(AccountB_address)
// Should show: 200 DOT (100 original + 100 from liquidation)

// Check MSC supply changes
MyStablecoin.totalSupply()
// Should reflect minted and burned amounts
```

## Phase 6: Additional Demo Scenarios

### Step 16: Healthy Liquidation Attempt
```solidity
// Try to liquidate a healthy position
// First, restore DOT price to $5
MockPriceOracle.updatePrice(500000000)

// Create new healthy position with remaining tokens
// Attempt liquidation - should fail with "Healthy vault" message
```

### Step 17: Edge Cases Demo
```solidity
// 1. Try borrowing with no collateral
LendingVault.borrow(100)  // Should fail: "No collateral"

// 2. Try borrowing more than LTV allows
// Deposit some collateral then try to borrow > 75% of value

// 3. Try depositing zero collateral
LendingVault.depositCollateral(0)  // Should fail: "Amount must be greater than zero"
```

## Key Demo Points to Highlight

1. **Loan-to-Value Ratio**: Maximum 75% of collateral value can be borrowed
2. **Liquidation Threshold**: Positions become liquidatable when health ratio < 80%
3. **Price Sensitivity**: Collateral price changes directly affect borrowing capacity and liquidation risk
4. **Complete Liquidation**: Entire position is liquidated (not partial)
5. **Liquidator Incentive**: Liquidators can acquire collateral at discount during market stress

