// Wallet and Account Types
export interface WalletAccount {
  address: string;
  name: string;
  source: string;
}

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type WalletType = 'polkadot' | 'ethereum';

// Asset Types
export interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  price: number;
  isStablecoin?: boolean;
}

// Protocol Data Types
export interface MarketData {
  asset: Asset;
  totalSupplied: number;
  totalBorrowed: number;
  supplyAPY: number;
  borrowAPY: number;
  collateralFactor: number; // 0.8 means 80% LTV
  liquidationThreshold: number; // 0.85 means liquidation at 85% LTV
  available: number;
}

export interface UserPosition {
  asset: Asset;
  supplied: number;
  borrowed: number;
  isCollateral: boolean;
}

export interface HealthRatio {
  value: number; // 1.5 means user has 150% of the required collateral
  status: 'healthy' | 'warning' | 'danger';
}

// Liquidation Types
export interface LiquidationOpportunity {
  id: string;
  borrower: string;
  collateralAsset: Asset;
  collateralAmount: number;
  debtAsset: Asset;
  debtAmount: number;
  discount: number; // 0.05 means 5% discount on collateral
  healthRatio: number;
}

// Transaction Types
export type TransactionStatus = 'pending' | 'success' | 'error';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'liquidate';
  asset: Asset;
  amount: number;
  status: TransactionStatus;
  timestamp: number;
  hash?: string;
}