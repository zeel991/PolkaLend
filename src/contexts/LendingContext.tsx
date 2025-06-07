import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Asset, MarketData, UserPosition, HealthRatio, Transaction, LiquidationOpportunity } from '../types';
import { mockAssets, mockMarketData } from '../utils/mockData';

interface LendingContextType {
  assets: Asset[];
  markets: MarketData[];
  userPositions: UserPosition[];
  healthRatio: HealthRatio;
  transactions: Transaction[];
  liquidationOpportunities: LiquidationOpportunity[];
  
  // Actions
  depositCollateral: (asset: Asset, amount: number) => Promise<void>;
  withdrawCollateral: (asset: Asset, amount: number) => Promise<void>;
  borrowAsset: (asset: Asset, amount: number) => Promise<void>;
  repayLoan: (asset: Asset, amount: number) => Promise<void>;
  liquidatePosition: (opportunity: LiquidationOpportunity) => Promise<void>;
  toggleCollateral: (asset: Asset) => Promise<void>;
}

const LendingContext = createContext<LendingContextType | undefined>(undefined);

export const LendingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [assets] = useState<Asset[]>(mockAssets);
  const [markets] = useState<MarketData[]>(mockMarketData);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [healthRatio, setHealthRatio] = useState<HealthRatio>({ value: 0, status: 'healthy' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [liquidationOpportunities, setLiquidationOpportunities] = useState<LiquidationOpportunity[]>([]);

  // Calculate health ratio based on positions
  const calculateHealthRatio = (positions: UserPosition[]): HealthRatio => {
    if (positions.length === 0) return { value: 0, status: 'healthy' };

    let totalCollateralValue = 0;
    let totalBorrowedValue = 0;

    positions.forEach((position) => {
      const market = markets.find(m => m.asset.id === position.asset.id);
      if (!market) return;

      if (position.isCollateral) {
        totalCollateralValue += position.supplied * position.asset.price * market.liquidationThreshold;
      }
      
      if (position.borrowed > 0) {
        totalBorrowedValue += position.borrowed * position.asset.price;
      }
    });

    if (totalBorrowedValue === 0) return { value: 0, status: 'healthy' };

    const ratio = totalCollateralValue / totalBorrowedValue;
    
    let status: HealthRatio['status'] = 'healthy';
    if (ratio < 1.2) status = 'danger';
    else if (ratio < 1.5) status = 'warning';

    return { value: ratio, status };
  };

  // Helper to add transaction
  const addTransaction = (type: Transaction['type'], asset: Asset, amount: number, status: Transaction['status'] = 'pending') => {
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      asset,
      amount,
      status,
      timestamp: Date.now(),
    };
    
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  };

  // Actions
  const depositCollateral = async (asset: Asset, amount: number): Promise<void> => {
    // In a real implementation, this would call the smart contract
    const transaction = addTransaction('deposit', asset, amount);
    
    // Simulate transaction processing
    setTimeout(() => {
      // Update the position
      const existingPosition = userPositions.find(p => p.asset.id === asset.id);
      
      if (existingPosition) {
        setUserPositions(userPositions.map(p => 
          p.asset.id === asset.id 
            ? { ...p, supplied: p.supplied + amount, isCollateral: true } 
            : p
        ));
      } else {
        setUserPositions([...userPositions, {
          asset,
          supplied: amount,
          borrowed: 0,
          isCollateral: true
        }]);
      }
      
      // Update transaction status
      setTransactions(prev => 
        prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'success' } : tx)
      );
      
      // Recalculate health ratio
      const newPositions = existingPosition 
        ? userPositions.map(p => p.asset.id === asset.id ? { ...p, supplied: p.supplied + amount, isCollateral: true } : p)
        : [...userPositions, { asset, supplied: amount, borrowed: 0, isCollateral: true }];
        
      setHealthRatio(calculateHealthRatio(newPositions));
      
    }, 2000);
  };

  const withdrawCollateral = async (asset: Asset, amount: number): Promise<void> => {
    const position = userPositions.find(p => p.asset.id === asset.id);
    if (!position || position.supplied < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Check if withdrawal would cause health ratio to drop too low
    const simulatedPositions = userPositions.map(p => 
      p.asset.id === asset.id 
        ? { ...p, supplied: p.supplied - amount } 
        : p
    );
    
    const newHealthRatio = calculateHealthRatio(simulatedPositions);
    if (newHealthRatio.status === 'danger') {
      throw new Error('Withdrawal would put your position at risk of liquidation');
    }
    
    const transaction = addTransaction('withdraw', asset, amount);
    
    // Simulate transaction processing
    setTimeout(() => {
      setUserPositions(userPositions.map(p => 
        p.asset.id === asset.id 
          ? { ...p, supplied: p.supplied - amount } 
          : p
      ).filter(p => p.supplied > 0 || p.borrowed > 0));
      
      setTransactions(prev => 
        prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'success' } : tx)
      );
      
      setHealthRatio(newHealthRatio);
    }, 2000);
  };

  const borrowAsset = async (asset: Asset, amount: number): Promise<void> => {
    // Calculate max borrowable amount based on collateral
    const totalCollateralValue = userPositions.reduce((total, position) => {
      if (!position.isCollateral) return total;
      const market = markets.find(m => m.asset.id === position.asset.id);
      if (!market) return total;
      
      return total + (position.supplied * position.asset.price * market.collateralFactor);
    }, 0);
    
    const totalBorrowedValue = userPositions.reduce((total, position) => {
      return total + (position.borrowed * position.asset.price);
    }, 0);
    
    const maxBorrowable = totalCollateralValue - totalBorrowedValue;
    const borrowValue = amount * asset.price;
    
    if (borrowValue > maxBorrowable) {
      throw new Error('Insufficient collateral for this borrow amount');
    }
    
    const transaction = addTransaction('borrow', asset, amount);
    
    // Simulate transaction processing
    setTimeout(() => {
      const existingPosition = userPositions.find(p => p.asset.id === asset.id);
      
      if (existingPosition) {
        setUserPositions(userPositions.map(p => 
          p.asset.id === asset.id 
            ? { ...p, borrowed: p.borrowed + amount } 
            : p
        ));
      } else {
        setUserPositions([...userPositions, {
          asset,
          supplied: 0,
          borrowed: amount,
          isCollateral: false
        }]);
      }
      
      setTransactions(prev => 
        prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'success' } : tx)
      );
      
      // Recalculate health ratio
      const newPositions = existingPosition 
        ? userPositions.map(p => p.asset.id === asset.id ? { ...p, borrowed: p.borrowed + amount } : p)
        : [...userPositions, { asset, supplied: 0, borrowed: amount, isCollateral: false }];
        
      setHealthRatio(calculateHealthRatio(newPositions));
    }, 2000);
  };

  const repayLoan = async (asset: Asset, amount: number): Promise<void> => {
    const position = userPositions.find(p => p.asset.id === asset.id && p.borrowed > 0);
    if (!position) {
      throw new Error('No outstanding loan for this asset');
    }
    
    const amountToRepay = Math.min(amount, position.borrowed);
    
    const transaction = addTransaction('repay', asset, amountToRepay);
    
    // Simulate transaction processing
    setTimeout(() => {
      setUserPositions(userPositions.map(p => 
        p.asset.id === asset.id 
          ? { ...p, borrowed: p.borrowed - amountToRepay } 
          : p
      ).filter(p => p.supplied > 0 || p.borrowed > 0));
      
      setTransactions(prev => 
        prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'success' } : tx)
      );
      
      // Recalculate health ratio
      const newPositions = userPositions.map(p => 
        p.asset.id === asset.id ? { ...p, borrowed: p.borrowed - amountToRepay } : p
      ).filter(p => p.supplied > 0 || p.borrowed > 0);
        
      setHealthRatio(calculateHealthRatio(newPositions));
    }, 2000);
  };

  const toggleCollateral = async (asset: Asset): Promise<void> => {
    const position = userPositions.find(p => p.asset.id === asset.id);
    if (!position) {
      throw new Error('No position for this asset');
    }
    
    // If turning off collateral, check if it would make health ratio too low
    if (position.isCollateral) {
      const simulatedPositions = userPositions.map(p => 
        p.asset.id === asset.id ? { ...p, isCollateral: false } : p
      );
      
      const newHealthRatio = calculateHealthRatio(simulatedPositions);
      if (newHealthRatio.status === 'danger') {
        throw new Error('Disabling this collateral would put your position at risk of liquidation');
      }
    }
    
    // In a real implementation, this would call the smart contract
    setTimeout(() => {
      setUserPositions(userPositions.map(p => 
        p.asset.id === asset.id ? { ...p, isCollateral: !p.isCollateral } : p
      ));
      
      // Recalculate health ratio
      const newPositions = userPositions.map(p => 
        p.asset.id === asset.id ? { ...p, isCollateral: !p.isCollateral } : p
      );
        
      setHealthRatio(calculateHealthRatio(newPositions));
    }, 1000);
  };

  const liquidatePosition = async (opportunity: LiquidationOpportunity): Promise<void> => {
    const transaction = addTransaction('liquidate', opportunity.collateralAsset, opportunity.collateralAmount);
    
    // Simulate transaction processing
    setTimeout(() => {
      // Remove the liquidated opportunity
      setLiquidationOpportunities(opportunities => 
        opportunities.filter(o => o.id !== opportunity.id)
      );
      
      // Update transaction
      setTransactions(prev => 
        prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'success' } : tx)
      );
      
    }, 2000);
  };

  return (
    <LendingContext.Provider
      value={{
        assets,
        markets,
        userPositions,
        healthRatio,
        transactions,
        liquidationOpportunities,
        depositCollateral,
        withdrawCollateral,
        borrowAsset,
        repayLoan,
        liquidatePosition,
        toggleCollateral,
      }}
    >
      {children}
    </LendingContext.Provider>
  );
};

export const useLending = (): LendingContextType => {
  const context = useContext(LendingContext);
  if (context === undefined) {
    throw new Error('useLending must be used within a LendingProvider');
  }
  return context;
};