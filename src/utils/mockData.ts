import { Asset, MarketData, LiquidationOpportunity } from '../types';

// Mock Assets
export const mockAssets: Asset[] = [
  {
    id: 'dot',
    name: 'Polkadot',
    symbol: 'DOT',
    icon: '/assets/dot.svg',
    decimals: 10,
    price: 5.21,
  },
  {
    id: 'ksm',
    name: 'Kusama',
    symbol: 'KSM',
    icon: '/assets/ksm.svg',
    decimals: 12,
    price: 24.56,
  },
  {
    id: 'astr',
    name: 'Astar',
    symbol: 'ASTR',
    icon: '/assets/astr.svg',
    decimals: 18,
    price: 0.056,
  },
  {
    id: 'glmr',
    name: 'Moonbeam',
    symbol: 'GLMR',
    icon: '/assets/glmr.svg',
    decimals: 18,
    price: 0.18,
  },
  {
    id: 'usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    icon: '/assets/usdt.svg',
    decimals: 6,
    price: 1.00,
    isStablecoin: true,
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    icon: '/assets/usdc.svg',
    decimals: 6,
    price: 1.00,
    isStablecoin: true,
  },
];

// Mock Market Data
export const mockMarketData: MarketData[] = [
  {
    asset: mockAssets[0], // DOT
    totalSupplied: 4500000,
    totalBorrowed: 2250000,
    supplyAPY: 2.5,
    borrowAPY: 5.2,
    collateralFactor: 0.75, // 75% LTV ratio
    liquidationThreshold: 0.80, // 80% threshold
    available: 2250000,
  },
  {
    asset: mockAssets[1], // KSM
    totalSupplied: 750000,
    totalBorrowed: 375000,
    supplyAPY: 3.8,
    borrowAPY: 7.5,
    collateralFactor: 0.70, // 70% LTV ratio
    liquidationThreshold: 0.75, // 75% threshold
    available: 375000,
  },
  {
    asset: mockAssets[2], // ASTR
    totalSupplied: 85000000,
    totalBorrowed: 42500000,
    supplyAPY: 6.2,
    borrowAPY: 12.4,
    collateralFactor: 0.65, // 65% LTV ratio
    liquidationThreshold: 0.70, // 70% threshold
    available: 42500000,
  },
  {
    asset: mockAssets[3], // GLMR
    totalSupplied: 35000000,
    totalBorrowed: 15750000,
    supplyAPY: 5.8,
    borrowAPY: 11.6,
    collateralFactor: 0.65, // 65% LTV ratio
    liquidationThreshold: 0.70, // 70% threshold
    available: 19250000,
  },
  {
    asset: mockAssets[4], // USDT
    totalSupplied: 6500000,
    totalBorrowed: 5200000,
    supplyAPY: 8.5,
    borrowAPY: 12.8,
    collateralFactor: 0.80, // 80% LTV ratio
    liquidationThreshold: 0.85, // 85% threshold
    available: 1300000,
  },
  {
    asset: mockAssets[5], // USDC
    totalSupplied: 8500000,
    totalBorrowed: 6800000,
    supplyAPY: 8.2,
    borrowAPY: 12.5,
    collateralFactor: 0.80, // 80% LTV ratio
    liquidationThreshold: 0.85, // 85% threshold
    available: 1700000,
  }
];

// Mock Liquidation Opportunities
export const mockLiquidationOpportunities: LiquidationOpportunity[] = [
  {
    id: 'liq-1',
    borrower: '5DANRuNvnGxQdqQR6xpcLZZJM8DqmQHwJJP1s7xzRoErhAgQ',
    collateralAsset: mockAssets[0], // DOT
    collateralAmount: 1200,
    debtAsset: mockAssets[4], // USDT
    debtAmount: 4800,
    discount: 0.08, // 8% discount
    healthRatio: 0.95,
  },
  {
    id: 'liq-2',
    borrower: '5FWykeJg6HVVw4LQQKpdtAWESBPrBbKm3qGhNymNLMjQyHXb',
    collateralAsset: mockAssets[1], // KSM
    collateralAmount: 180,
    debtAsset: mockAssets[5], // USDC
    debtAmount: 3200,
    discount: 0.07, // 7% discount
    healthRatio: 0.97,
  },
  {
    id: 'liq-3',
    borrower: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    collateralAsset: mockAssets[3], // GLMR
    collateralAmount: 35000,
    debtAsset: mockAssets[4], // USDT
    debtAmount: 4100,
    discount: 0.10, // 10% discount
    healthRatio: 0.92,
  },
];

// Mock default public assets for landing page
export const publicAssets = [
  '/assets/dot.svg',
  '/assets/ksm.svg',
  '/assets/astr.svg',
  '/assets/glmr.svg',
  '/assets/usdt.svg',
  '/assets/usdc.svg',
];