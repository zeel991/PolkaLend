import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import Card from '../components/ui/Card';
import HealthRatioGauge from '../components/ui/HealthRatioGauge';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { Info, Sparkles, Wallet, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { useLendingData } from '../utils/useLendingData';

// Import container components
import ApproveContainer from '../containers/ApproveContainer';
import BorrowContainer from '../containers/BorrowContainer';
import RepayContainer from '../containers/RepayContainer';
import SupplyContainer from '../containers/SupplyContainer';

// Import shared types
import {
  LendingTab,
  AssetWithBalance,
  ApprovalState,
  TokenApproval,
  getAccountAddress,
  toNumber
} from '../types/lending';

// Enhanced Card Animation Component
const AnimatedCard: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ 
  children, 
  className = "", 
  delay = 0 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ 
      scale: 1.02,
      y: -4,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    whileTap={{ scale: 0.99 }}
    className="group cursor-pointer"
  >
    <Card className={`
      relative overflow-hidden
      bg-gradient-to-br from-purple-50/60 to-pink-50/60 
      dark:from-purple-900/40 dark:to-pink-900/30 
      border border-purple-200/60 dark:border-purple-700/40
      backdrop-blur-sm shadow-lg
      hover:shadow-2xl hover:shadow-purple-500/25
      hover:border-purple-400/80 dark:hover:border-purple-500/60
      transform transition-all duration-300 ease-out
      hover:bg-gradient-to-br hover:from-purple-100/80 hover:to-pink-100/80
      dark:hover:from-purple-800/50 dark:hover:to-pink-800/40
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-pink-400/0 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </Card>
  </motion.div>
);

const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ active, onClick, children, icon }) => (
  <motion.button
    className={`pb-3 px-6 py-2 font-bold text-sm relative group transition-all duration-300 rounded-t-lg ${
      active
        ? 'text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30'
        : 'text-purple-700 dark:text-purple-300 bg-gradient-to-r from-purple-100/80 to-pink-100/80 dark:from-purple-900/60 dark:to-pink-900/60 hover:from-purple-200/90 hover:to-pink-200/90 dark:hover:from-purple-800/80 dark:hover:to-pink-800/80 border border-purple-200/60 dark:border-purple-700/60 hover:border-purple-300/80 dark:hover:border-purple-600/80 shadow-md hover:shadow-lg hover:shadow-purple-500/20'
    }`}
    onClick={onClick}
    whileHover={{ scale: 1.05, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center space-x-2 relative z-10">
      {icon && <span className={`text-lg ${active ? 'drop-shadow-sm' : ''}`}>{icon}</span>}
      <span className={active ? 'drop-shadow-sm' : ''}>{children}</span>
    </div>
    
    <motion.div
      className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
      initial={false}
      animate={{ 
        opacity: active ? 1 : 0,
        scaleX: active ? 1 : 0
      }}
      transition={{ duration: 0.3 }}
    />
    
    {active && (
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        -translate-x-full animate-pulse" />
      </div>
    )}
    
    <div className={`absolute inset-0 rounded-t-lg bg-gradient-to-r from-purple-200/60 to-pink-200/60 
                    dark:from-purple-700/40 dark:to-pink-700/40 opacity-0 group-hover:opacity-100 
                    transition-opacity duration-300 ${active ? 'hidden' : ''}`} />
  </motion.button>
);

const Borrow: React.FC = () => {
  // Data hooks
  const { 
    netWorth, 
    oraclePrice,
    isLoading
  } = useLendingData();

  const { 
    markets, 
    userPositions, 
    healthRatio,
  } = useLending();
  
  const { selectedAccount } = useWallet();

  // UI state
  const [selectedAsset, setSelectedAsset] = useState<AssetWithBalance | null>(null);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LendingTab>('approve');
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right'>('right');
  
  // Approval tracking state
  const [approvals, setApprovals] = useState<ApprovalState>({});
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);

  // Tab order for directional animation
  const tabOrder: LendingTab[] = ['approve', 'collateral', 'borrow', 'repay'];

  // Get stablecoins (for default selection)
  const stablecoins = markets.filter(market => market.asset.isStablecoin);

  // Fake DOT token for demo
  const fakeDotToken: AssetWithBalance = {
    id: 'dot-token',
    symbol: 'DOT',
    name: 'Polkadot',
    icon: '/assets/download.svg',
    price: toNumber(oraclePrice?.price),
    walletBalance: toNumber(netWorth),
    decimals: 10,
    isStablecoin: false
  };

  // Helper function to get wallet balance for an asset
  const getWalletBalance = (asset: AssetWithBalance): number => {
    if (asset.id === 'dot-token') {
      return toNumber(netWorth);
    }
    
    const assetWithBalance = asset as AssetWithBalance;
    if (assetWithBalance.walletBalance !== undefined) {
      return toNumber(assetWithBalance.walletBalance);
    }
    
    const market = markets.find(m => m.asset.id === asset.id);
    const marketAssetWithBalance = market?.asset as AssetWithBalance;
    if (marketAssetWithBalance?.walletBalance !== undefined) {
      return toNumber(marketAssetWithBalance.walletBalance);
    }
    
    return 0;
  };

  // Helper function to get all approvals for current account
  const getCurrentAccountApprovals = (): TokenApproval[] => {
    if (!selectedAccount) return [];
    const accountKey = getAccountAddress(selectedAccount);
    const accountApprovals = approvals[accountKey];
    if (!accountApprovals) return [];
    return Object.values(accountApprovals).filter((approval: TokenApproval) => approval.amount > 0);
  };

  // Set default selected asset based on active tab
  useEffect(() => {
    if (!selectedAsset) {
      if (activeTab === 'collateral' || activeTab === 'approve') {
        setSelectedAsset(fakeDotToken);
      } else if (stablecoins.length > 0) {
        setSelectedAsset(stablecoins[0].asset);
      }
    }
  }, [markets, activeTab, selectedAsset, fakeDotToken, stablecoins]);

  // Calculate borrowing stats
  const totalCollateralValue = userPositions.reduce((sum, position) => {
    if (!position.isCollateral) return sum;
    const market = markets.find(m => m.asset.id === position.asset.id);
    if (!market) return sum;
    
    return sum + (position.supplied * position.asset.price * market.collateralFactor);
  }, 0);

  const totalBorrowedValue = userPositions.reduce((sum, position) => {
    return sum + (position.borrowed * position.asset.price);
  }, 0);

  const selectedMarket = selectedAsset ? markets.find(m => m.asset.id === selectedAsset.id) : null;
  const userPosition = selectedAsset ? userPositions.find(p => p.asset.id === selectedAsset.id) : null;
  
  // Calculate max amounts
  const maxBorrowValue = Math.max(0, totalCollateralValue - totalBorrowedValue);
  const maxBorrowAmount = selectedAsset && selectedMarket 
    ? Math.min(maxBorrowValue / selectedAsset.price, selectedMarket.available)
    : 0;

  const maxRepayAmount = userPosition ? userPosition.borrowed : 0;
  const maxCollateralAmount = selectedAsset ? getWalletBalance(selectedAsset) : 0;

  // Simulate new health ratio
  const simulatedAmount = parseFloat(borrowAmount) || 0;
  const simulatedHealthRatio = { ...healthRatio };
  
  if (selectedAsset && simulatedAmount > 0) {
    let simulatedBorrowValue = totalBorrowedValue;
    let simulatedCollateralValue = totalCollateralValue;
    
    if (activeTab === 'borrow') {
      simulatedBorrowValue = totalBorrowedValue + (simulatedAmount * selectedAsset.price);
    } else if (activeTab === 'repay') {
      simulatedBorrowValue = totalBorrowedValue - Math.min(simulatedAmount, maxRepayAmount) * selectedAsset.price;
    } else if (activeTab === 'collateral' && selectedMarket) {
      simulatedCollateralValue = totalCollateralValue + (simulatedAmount * selectedAsset.price * selectedMarket.collateralFactor);
    }
    
    if (simulatedBorrowValue > 0) {
      const totalCollateralValueForLiquidation = userPositions.reduce((sum, position) => {
        if (!position.isCollateral) return sum;
        const market = markets.find(m => m.asset.id === position.asset.id);
        if (!market) return sum;
        
        return sum + (position.supplied * position.asset.price * market.liquidationThreshold);
      }, 0);
      
      const simulatedCollateralForLiquidation = activeTab === 'collateral' && selectedMarket
        ? totalCollateralValueForLiquidation + (simulatedAmount * selectedAsset.price * selectedMarket.liquidationThreshold)
        : totalCollateralValueForLiquidation;
      
      const newRatio = simulatedCollateralForLiquidation / simulatedBorrowValue;
      
      let status: 'healthy' | 'warning' | 'danger' = 'healthy';
      if (newRatio < 1.2) status = 'danger';
      else if (newRatio < 1.5) status = 'warning';
      
      simulatedHealthRatio.value = newRatio;
      simulatedHealthRatio.status = status;
    } else if (activeTab === 'collateral' && simulatedBorrowValue === 0) {
      simulatedHealthRatio.value = 999;
      simulatedHealthRatio.status = 'healthy';
    }
  }

  // Get available assets for each tab
  const getAvailableAssets = () => {
    if (activeTab === 'approve') {
      const assetsWithBalance = markets.filter(market => getWalletBalance(market.asset) > 0);
      return [{ asset: fakeDotToken }, ...assetsWithBalance];
    } else if (activeTab === 'collateral') {
      const assetsWithBalance = markets.filter(market => getWalletBalance(market.asset) > 0);
      return [{ asset: fakeDotToken }, ...assetsWithBalance];
    } else if (activeTab === 'borrow') {
      return markets;
    } else {
      return userPositions.filter(p => p.borrowed > 0);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: LendingTab) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(tab);
    
    // Determine animation direction before changing tab
    if (newIndex > currentIndex) {
      setAnimationDirection('right');
    } else if (newIndex < currentIndex) {
      setAnimationDirection('left');
    }
    
    setActiveTab(tab);
    setBorrowAmount('');
    setError(null);
    setIsAssetMenuOpen(false);
  };

  // Handle transaction complete
  const handleTransactionComplete = () => {
    console.log('Transaction completed successfully');
  };

  // Shared props for containers
  const containerProps = {
    selectedAsset,
    setSelectedAsset,
    borrowAmount,
    setBorrowAmount,
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
    approvals,
    setApprovals,
    availableAssets: getAvailableAssets(),
    isAssetMenuOpen,
    setIsAssetMenuOpen,
    onTransactionComplete: handleTransactionComplete
  };

  // Enhanced Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            ⚡
          </motion.div>
          <h1 className="text-3xl font-heading font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Loading Your DeFi Dashboard...
          </h1>
          <p className="text-purple-600 dark:text-purple-400 max-w-2xl mx-auto mb-8">
            ✨ Please wait while we load your lending data from the blockchain.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-6xl mb-4"
          >
            <Wallet className="text-purple-500" size={64} />
          </motion.div>
          <h1 className="text-3xl font-heading font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔗 Connect Wallet to Borrow
          </h1>
          <p className="text-purple-600 dark:text-purple-400 max-w-2xl mx-auto mb-8">
            💫 Please connect your Polkadot wallet to access all borrowing features and start your DeFi journey.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2 
                       bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          💎 Lending Platform
        </h1>
        <p className="text-purple-600 dark:text-purple-400">
          🚀 Supply collateral and borrow against your deposited assets with premium DeFi features
        </p>
      </motion.div>
      
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="lg:col-span-2">
          <AnimatedCard delay={0.1}>
            <div className="p-6">
              <div className="flex border-b border-purple-200/30 dark:border-purple-700/30 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-pink-100/20 
                               dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-lg -z-10" />
                
                <motion.div
                  className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 opacity-30"
                  key={`${activeTab}-indicator`}
                  initial={false}
                  animate={{
                    x: animationDirection === 'right' ? ['0%', '100%'] : ['100%', '0%']
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
                
                <TabButton
                  active={activeTab === 'approve'}
                  onClick={() => handleTabChange('approve')}
                  icon="🔐"
                >
                  Approve Token
                </TabButton>
                <TabButton
                  active={activeTab === 'collateral'}
                  onClick={() => handleTabChange('collateral')}
                  icon="💎"
                >
                  Supply Collateral
                </TabButton>
                <TabButton
                  active={activeTab === 'borrow'}
                  onClick={() => handleTabChange('borrow')}
                  icon="💰"
                >
                  Borrow
                </TabButton>
                <TabButton
                  active={activeTab === 'repay'}
                  onClick={() => handleTabChange('repay')}
                  icon="💳"
                >
                  Repay
                </TabButton>
              </div>
              
              <motion.div
                key={activeTab}
                initial={{ 
                  opacity: 0, 
                  x: animationDirection === 'right' ? 50 : -50 
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ 
                  opacity: 0, 
                  x: animationDirection === 'right' ? -50 : 50 
                }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-pink-100/20 
                           dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg -z-10"
                  initial={{ 
                    x: animationDirection === 'right' ? '100%' : '-100%',
                    opacity: 0 
                  }}
                  animate={{ x: '0%', opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                
                {activeTab === 'approve' && (
                  <ApproveContainer {...containerProps} />
                )}
                
                {activeTab === 'collateral' && (
                  <SupplyContainer 
                    {...containerProps} 
                    maxCollateralAmount={maxCollateralAmount}
                    healthRatio={healthRatio}
                    simulatedHealthRatio={simulatedHealthRatio}
                  />
                )}
                
                {activeTab === 'borrow' && (
                  <BorrowContainer 
                    {...containerProps} 
                    maxBorrowAmount={maxBorrowAmount}
                    healthRatio={healthRatio}
                    simulatedHealthRatio={simulatedHealthRatio}
                  />
                )}
                
                {activeTab === 'repay' && (
                  <RepayContainer 
                    {...containerProps} 
                    maxRepayAmount={maxRepayAmount}
                    healthRatio={healthRatio}
                    simulatedHealthRatio={simulatedHealthRatio}
                  />
                )}
              </motion.div>
            </div>
          </AnimatedCard>
        </div>
        
        <div>
          <AnimatedCard delay={0.2}>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="text-purple-500" size={20} />
                <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  📊 Account Overview
                </h2>
              </div>
              
              <div className="space-y-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-purple-100/50 to-pink-100/50 
                           dark:from-purple-900/30 dark:to-pink-900/20 border border-purple-200/30 
                           dark:border-purple-700/30 transition-all duration-300"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="text-purple-500" size={16} />
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Health Ratio
                    </p>
                  </div>
                  <HealthRatioGauge healthRatio={simulatedAmount > 0 ? simulatedHealthRatio : healthRatio} size="md" />
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-blue-100/50 to-purple-100/50 
                           dark:from-blue-900/30 dark:to-purple-900/20 border border-blue-200/30 
                           dark:border-blue-700/30 transition-all duration-300"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="text-purple-500" size={16} />
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Borrowing Power
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-purple-800 dark:text-purple-200">
                    {formatCurrency(maxBorrowValue)}
                  </p>
                  <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${totalCollateralValue > 0 
                          ? Math.min(100, (totalBorrowedValue / totalCollateralValue) * 100) 
                          : 0}%` 
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400 mt-1">
                    <span>💳 {formatCurrency(totalBorrowedValue)}</span>
                    <span>💎 {formatCurrency(totalCollateralValue)}</span>
                  </div>
                </motion.div>
                
                <div className="pt-4 border-t border-purple-200/30 dark:border-purple-700/30">
                  <h3 className="text-sm font-medium mb-3 text-purple-800 dark:text-purple-200 flex items-center">
                    <DollarSign className="text-purple-500 mr-2" size={16} />
                    Your Collateral
                  </h3>
                  {userPositions.filter(p => p.isCollateral && p.supplied > 0).length > 0 ? (
                    <div className="space-y-3">
                      {userPositions
                        .filter(p => p.isCollateral && p.supplied > 0)
                        .map((position, index) => {
                          const market = markets.find(m => m.asset.id === position.asset.id);
                          return (
                            <motion.div 
                              key={position.asset.id} 
                              className="flex justify-between items-center p-2 rounded-lg 
                                       bg-gradient-to-r from-green-100/30 to-blue-100/30 
                                       dark:from-green-900/20 dark:to-blue-900/20 
                                       border border-green-200/30 dark:border-green-700/30
                                       transition-all duration-200"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ scale: 1.02, x: 4 }}
                            >
                              <div className="flex items-center">
                                <img src={position.asset.icon} alt={position.asset.name} className="w-5 h-5 mr-2" />
                                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                  {position.asset.symbol}
                                </span>
                              </div>
                              <div className="text-sm text-right">
                                <div className="text-green-600 dark:text-green-400 font-medium">
                                  {formatNumber(position.supplied)}
                                </div>
                                {market && (
                                  <div className="text-xs text-purple-600 dark:text-purple-400">
                                    {(market.collateralFactor * 100).toFixed(0)}% LTV
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  ) : (
                    <motion.div 
                      className="text-sm text-purple-600 dark:text-purple-400 flex items-start p-3 
                               rounded-lg bg-gradient-to-br from-purple-50/30 to-pink-50/30 
                               dark:from-purple-900/20 dark:to-pink-900/10 border border-purple-200/30 
                               dark:border-purple-700/20 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Info size={16} className="mr-2 mt-0.5 flex-shrink-0 text-purple-500" />
                      <span>💡 Supply assets as collateral to start borrowing. Use the "Supply Collateral" tab above.</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-purple-200/30 dark:border-purple-700/30">
                  <h3 className="text-sm font-medium mb-3 text-purple-800 dark:text-purple-200 flex items-center">
                    <TrendingUp className="text-purple-500 mr-2" size={16} />
                    Your Borrowed Assets
                  </h3>
                  {userPositions.filter(p => p.borrowed > 0).length > 0 ? (
                    <div className="space-y-3">
                      {userPositions
                        .filter(p => p.borrowed > 0)
                        .map((position, index) => {
                          const market = markets.find(m => m.asset.id === position.asset.id);
                          return (
                            <motion.div 
                              key={position.asset.id} 
                              className="flex justify-between items-center p-2 rounded-lg 
                                       bg-gradient-to-r from-red-100/30 to-pink-100/30 
                                       dark:from-red-900/20 dark:to-pink-900/20 
                                       border border-red-200/30 dark:border-red-700/30
                                       transition-all duration-200"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ scale: 1.02, x: 4 }}
                            >
                              <div className="flex items-center">
                                <img src={position.asset.icon} alt={position.asset.name} className="w-5 h-5 mr-2" />
                                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                  {position.asset.symbol}
                                </span>
                              </div>
                              <div className="text-sm text-right">
                                <div className="text-red-600 dark:text-red-400 font-medium">
                                  {formatNumber(position.borrowed)}
                                </div>
                                {market && (
                                  <div className="text-xs text-purple-600 dark:text-purple-400">
                                    {market.borrowAPY.toFixed(2)}% APY
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  ) : (
                    <motion.div 
                      className="text-sm text-purple-600 dark:text-purple-400 p-3 rounded-lg 
                               bg-gradient-to-br from-purple-50/30 to-pink-50/30 
                               dark:from-purple-900/20 dark:to-pink-900/10 border border-purple-200/30 
                               dark:border-purple-700/20 text-center transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      🎯 You have no borrowed assets yet.
                    </motion.div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-purple-200/30 dark:border-purple-700/30">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 flex items-center">
                      <Shield className="text-purple-500 mr-2" size={16} />
                      Token Approvals
                    </h3>
                    <motion.button
                      onClick={() => setShowApprovalHistory(!showApprovalHistory)}
                      className="text-xs text-purple-500 hover:text-purple-600 dark:text-purple-400 
                               dark:hover:text-purple-300 font-medium px-2 py-1 rounded 
                               hover:bg-purple-100/30 dark:hover:bg-purple-900/20 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {showApprovalHistory ? '👁️ Hide' : '👀 Show All'}
                    </motion.button>
                  </div>
                  
                  {getCurrentAccountApprovals().length > 0 ? (
                    <div className="space-y-3">
                      {getCurrentAccountApprovals()
                        .slice(0, showApprovalHistory ? undefined : 3)
                        .map((approval: TokenApproval, index) => (
                          <motion.div 
                            key={approval.asset.id} 
                            className="flex justify-between items-center p-2 rounded-lg 
                                     bg-gradient-to-r from-green-100/30 to-blue-100/30 
                                     dark:from-green-900/20 dark:to-blue-900/20 
                                     border border-green-200/30 dark:border-green-700/30
                                     transition-all duration-200"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 4 }}
                          >
                            <div className="flex items-center">
                              <img src={approval.asset.icon} alt={approval.asset.name} className="w-5 h-5 mr-2" />
                              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                {approval.asset.symbol}
                              </span>
                            </div>
                            <div className="text-sm text-right">
                              <div className="text-green-600 dark:text-green-400 font-medium">
                                {formatNumber(approval.amount)}
                              </div>
                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                {approval.timestamp.toLocaleDateString()}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      
                      {getCurrentAccountApprovals().length > 3 && !showApprovalHistory && (
                        <motion.div 
                          className="text-xs text-purple-600 dark:text-purple-400 text-center p-2 
                                   rounded-lg bg-gradient-to-r from-purple-100/20 to-pink-100/20 
                                   dark:from-purple-900/10 dark:to-pink-900/10 transition-all duration-300"
                          whileHover={{ scale: 1.02 }}
                        >
                          ✨ +{getCurrentAccountApprovals().length - 3} more approvals
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <motion.div 
                      className="text-sm text-purple-600 dark:text-purple-400 flex items-start p-3 
                               rounded-lg bg-gradient-to-br from-purple-50/30 to-pink-50/30 
                               dark:from-purple-900/20 dark:to-pink-900/10 border border-purple-200/30 
                               dark:border-purple-700/20 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Info size={16} className="mr-2 mt-0.5 flex-shrink-0 text-purple-500" />
                      <span>🔒 No token approvals yet. Use the "Approve Token" tab to grant permissions.</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </motion.div>
    </div>
  );
};

export default Borrow;