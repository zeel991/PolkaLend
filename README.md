

# 💱 PolkaLend – Lending Protocol Demo Guide

PolkaLend is a decentralized lending protocol built for the Polkadot ecosystem, tested on **Westend** and demoed using the **Reix London VM** for rapid iteration.

📎 **Demo Video**: [Watch on Google Drive](https://drive.google.com/file/d/1zNi7KkYjmztwQ3dvvoT8afjEzkqPJ8tD/view?usp=sharing)

---

## ⚙️ Phase 1: Contract Deployment

### 1. Deploy `CollateralToken`
- Deploy `CollateralToken.sol` with no constructor parameters
- Mints **1000 DOT** to the deployer

### 2. Deploy `MockPriceOracle`
- Constructor parameter: `initialPrice = 500000000` (represents $5.00 with 8 decimals)

### 3. Deploy `MyStablecoin`
- Constructor parameter: `_owner = your_wallet_address`

### 4. Deploy `LendingVault`
- Constructor parameters:
  - `_collateral` = `CollateralToken` contract address
  - `_stablecoin` = `MyStablecoin` contract address
  - `_oracle` = `MockPriceOracle` contract address

### 5. Mint Tokens for Liquidator
```solidity
MyStablecoin.mint(AccountB_address, 500 );  // 500 MSC to Account B
````

---

## 👥 Phase 2: Setup Test Accounts

### Account Roles:

* **Account A (Borrower)**: Main demo account
* **Account B (Liquidator)**: Will perform liquidation
* **Account C (Oracle Owner)**: Will simulate price change

### Distribute DOT (Collateral Tokens)

```solidity
CollateralToken.transfer(AccountA_address, 200 );
CollateralToken.transfer(AccountB_address, 100 );
```

---

## 🚀 Phase 3: Core Functionality Demo

### 8. Deposit Collateral (Account A)

```solidity
LendingVault.depositCollateral(100 * 1e18);
```

* Emits `CollateralDeposited` event
* `vaults[AccountA].collateralAmount == 100`

### 9. Borrow Stablecoins (Account A)

* Collateral value = 100 DOT × \$5 = \$500
* Max LTV = 75% ⇒ Borrow limit = \$375
* Borrowing \$300:

```solidity
LendingVault.borrow(300 );
```

* Emits `Borrowed` event
* Vault debt = 300 MSC

### 10. Check Health Ratio

```solidity
LendingVault.getHealthRatio(AccountA_address);
```

* Expected: `(100 × 5) / 300 * 100 = 166.67%` (Healthy)

---

## ⚠️ Phase 4: Liquidation Demo

### 11. Simulate Price Drop

```solidity
MockPriceOracle.updatePrice(2);  // $2.00
```

### 12. Check Health After Drop

```solidity
LendingVault.getHealthRatio(AccountA_address);
// Now: (100 × 2) / 300 * 100 = 66.67% (Unhealthy)
```

### 13. Prepare Liquidator

```solidity
MyStablecoin.balanceOf(AccountB_address);  // Should be 500 MSC
MyStablecoin.approve(LendingVault_address, 300 );
```

### 14. Execute Liquidation

```solidity
LendingVault.liquidate(AccountA_address);
```

* Burns 300 MSC from Account B
* Transfers 100 DOT to Account B
* Deletes Account A’s vault

---

## ✅ Phase 5: Post-Liquidation Checks

### Final State:

```solidity
LendingVault.vaults(AccountA_address); // => 0 collateral, 0 debt
CollateralToken.balanceOf(AccountB_address); // => 100 DOT (or 200 if added before)
MyStablecoin.totalSupply(); // Reflects burned MSC
```

---

## 📌 Key Features to Highlight

* 🔐 **Loan-to-Value (LTV)**: Max 75%
* 🚨 **Liquidation Threshold**: Below 80% health triggers liquidation
* 📉 **Oracle Sensitivity**: Price directly affects vault risk
* 🧨 **Full Liquidation**: Entire vault is closed, not partial
* 💰 **Liquidator Incentive**: Acquires discounted collateral




 
