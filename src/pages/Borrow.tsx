import React, { useState, useEffect } from 'react';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import Card from '../components/ui/Card';
import HealthRatioGauge from '../components/ui/HealthRatioGauge';
import { Asset } from '../types';
import { formatCurrency, formatNumber, calculateMaxBorrowable, addCommasToNumber } from '../utils/helpers';
import { AlertCircle, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';    
import { useLendingData } from '../utils/useLendingData';
// const value = Dashboard.;

const Borrow: React.FC = () => {

  
    // Removed unused destructured elements from useLendingData
    const { netWorth: _networth, 
      oraclePrice: _oraclePrice,
      tokenBalance: _tokenBalance,
      isLoading} = useLendingData();
  

      

  const { 
    markets, 
    userPositions, 
    healthRatio, 
    borrowAsset, 
    repayLoan,
    supplyAsset // Assuming this function exists for supplying collateral
  } = useLending();
  const { status, selectedAccount } = useWallet();

  // UI state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'collateral' | 'borrow' | 'repay'>('collateral');

  // Get stablecoins (for default selection)
  const stablecoins = markets.filter(market => market.asset.isStablecoin);

  // Fake DOT token for collateral demo
  const fakeDotToken: Asset = {
    id: 'dot-token',
    symbol: 'DOT',
    name: 'Polkadot',
    icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
    price: _oraclePrice?.price,
    walletBalance: _networth,
    isStablecoin: false
  };

  useEffect(() => {
    // Set default selected asset to fake DOT for collateral, otherwise first stablecoin
    if (!selectedAsset) {
      if (activeTab === 'collateral') {
        setSelectedAsset(fakeDotToken);
      } else if (stablecoins.length > 0) {
        setSelectedAsset(stablecoins[0].asset);
      }
    }
  }, [markets, activeTab]);

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
  
  // Calculate max borrowable amount
  const maxBorrowValue = Math.max(0, totalCollateralValue - totalBorrowedValue);
  const maxBorrowAmount = selectedAsset && selectedMarket 
    ? Math.min(
        maxBorrowValue / selectedAsset.price,
        selectedMarket.available
      )
    : 0;

  // Calculate max repayable amount
  const maxRepayAmount = userPosition ? userPosition.borrowed : 0;

  // Calculate max collateral amount (use fake DOT balance or wallet balance)
  const maxCollateralAmount = selectedAsset 
    ? selectedAsset.id === 'dot-token' 
      ? fakeDotToken.walletBalance 
      : selectedAsset.walletBalance || 0
    : 0;

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setBorrowAmount(value);
      setError(null);
    }
  };

  // Set max amount
  const setMaxAmount = () => {
    if (activeTab === 'borrow') {
      setBorrowAmount(maxBorrowAmount.toFixed(4));
    } else if (activeTab === 'repay') {
      setBorrowAmount(maxRepayAmount.toFixed(4));
    } else if (activeTab === 'collateral') {
      setBorrowAmount(maxCollateralAmount.toFixed(4));
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset) return;
    
    const amount = parseFloat(borrowAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      if (activeTab === 'borrow') {
        if (amount > maxBorrowAmount) {
          throw new Error('Amount exceeds your borrowing capacity');
        }
        await borrowAsset(selectedAsset, amount);
      } else if (activeTab === 'repay') {
        if (amount > maxRepayAmount) {
          throw new Error('Amount exceeds your borrowed balance');
        }
        await repayLoan(selectedAsset, amount);
      } else if (activeTab === 'collateral') {
        if (amount > maxCollateralAmount) {
          throw new Error('Amount exceeds your wallet balance');
        }
        await supplyAsset(selectedAsset, amount, true); // true indicates it's for collateral
      }
      
      // Reset form
      setBorrowAmount('');
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      console.error('Transaction error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      
      // Add simulated collateral to liquidation threshold calculation
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
      // If no borrowed value but adding collateral, show healthy status
      simulatedHealthRatio.value = 999; // Very high ratio indicating no debt
      simulatedHealthRatio.status = 'healthy';
    }
  }

  // Get available assets for each tab
  const getAvailableAssets = () => {
    if (activeTab === 'collateral') {
      // Include fake DOT token and any markets with wallet balance
      const assetsWithBalance = markets.filter(market => market.asset.walletBalance && market.asset.walletBalance > 0);
      return [{ asset: fakeDotToken }, ...assetsWithBalance];
    } else if (activeTab === 'borrow') {
      return markets;
    } else {
      return userPositions.filter(p => p.borrowed > 0);
    }
  };

  if (!selectedAccount) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl text-center text-white">
        <h1 className="text-3xl font-heading font-bold mb-4">Connect Wallet to Borrow</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-8">
          Please connect your Polkadot wallet to access borrowing features.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">Lending Platform</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Supply collateral and borrow against your deposited assets
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-6">
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'collateral'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => {
                  setActiveTab('collateral');
                  setBorrowAmount('');
                  setError(null);
                }}
              >
                Supply Collateral
              </button>
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'borrow'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => {
                  setActiveTab('borrow');
                  setBorrowAmount('');
                  setError(null);
                }}
              >
                Borrow
              </button>
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'repay'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => {
                  setActiveTab('repay');
                  setBorrowAmount('');
                  setError(null);
                }}
              >
                Repay
              </button>
            </div>
            
            {/* Tab Description */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <Info size={16} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {activeTab === 'collateral' && (
                    <>
                      <strong>Supply Collateral:</strong> Deposit assets to use as collateral for borrowing. 
                      You must supply collateral before you can borrow against it.
                    </>
                  )}
                  {activeTab === 'borrow' && (
                    <>
                      <strong>Borrow:</strong> Borrow assets against your supplied collateral. 
                      Make sure to maintain a healthy collateralization ratio.
                    </>
                  )}
                  {activeTab === 'repay' && (
                    <>
                      <strong>Repay:</strong> Repay your borrowed assets to reduce debt and 
                      improve your health ratio.
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              {/* Asset selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Asset
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAssetMenuOpen(!isAssetMenuOpen)}
                    className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg flex items-center justify-between bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {selectedAsset ? (
                      <div className="flex items-center">
                        <img src={selectedAsset.icon} alt={selectedAsset.name} className="w-6 h-6 mr-3" />
                        <span className="font-medium">{selectedAsset.symbol}</span>
                        <span className="ml-2 text-neutral-500 dark:text-neutral-400 text-sm">
                          {selectedAsset.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-500 dark:text-neutral-400">Select an asset</span>
                    )}
                    <ChevronDown size={16} />
                  </button>
                  
                  <AnimatePresence>
                    {isAssetMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {getAvailableAssets().map((item) => {
                          const asset = 'asset' in item ? item.asset : item;
                          const displayBalance = asset.id === 'dot-token' ? fakeDotToken.walletBalance : asset.walletBalance;
                          return (
                            <div
                              key={asset.id}
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIsAssetMenuOpen(false);
                                setBorrowAmount('');
                              }}
                              className="p-3 flex items-center hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                            >
                              <img src={asset.icon} alt={asset.name} className="w-6 h-6 mr-3" />
                              <div className="flex-1">
                                <div className="font-medium">{asset.symbol}</div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {asset.name}
                                </div>
                              </div>
                              {activeTab === 'collateral' && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  Balance: {formatNumber(displayBalance || 0)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {getAvailableAssets().length === 0 && (
                          <div className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                            {activeTab === 'collateral' && 'No assets available in wallet'}
                            {activeTab === 'borrow' && 'No borrowable assets available'}
                            {activeTab === 'repay' && 'No borrowed assets to repay'}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Amount input */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Amount
                  </label>
                  
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center space-x-2">
                    <span>
                      {activeTab === 'collateral' && 'Wallet:'} 
                      {activeTab === 'borrow' && 'Available:'} 
                      {activeTab === 'repay' && 'Borrowed:'} {selectedAsset && (
                        <span className="font-medium">
                          {formatNumber(
                            activeTab === 'collateral' ? maxCollateralAmount :
                            activeTab === 'borrow' ? maxBorrowAmount : 
                            maxRepayAmount
                          )} USD
                        </span>
                      )}
                    </span>
                    <button
                    
                      type="button"
                      onClick={setMaxAmount}
                      className="text-primary-500 hover:text-primary-600 font-medium"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                
                <div className="flex">
                  <input
                    type="text"
                    value={addCommasToNumber(borrowAmount)}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800"
                  />
                </div>
                
                {error && (
                  <div className="mt-2 text-sm text-red-500 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {error}
                  </div>
                )}
                
                {/* Value in USD */}
                {selectedAsset && borrowAmount && !isNaN(parseFloat(borrowAmount)) && (
                  <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    ≈ {formatCurrency(parseFloat(borrowAmount) * selectedAsset.price)}
                  </div>
                )}
              </div>
              
              {/* Transaction details */}
              {selectedAsset && borrowAmount && !isNaN(parseFloat(borrowAmount)) && parseFloat(borrowAmount) > 0 && (
                <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <h3 className="text-sm font-medium mb-3">Transaction Preview</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">Health Factor</span>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">
                          {healthRatio.value === 999 ? '∞' : healthRatio.value.toFixed(2)} → {simulatedHealthRatio.value === 999 ? '∞' : simulatedHealthRatio.value.toFixed(2)}
                        </span>
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            simulatedHealthRatio.status === 'healthy' ? 'bg-success-500' :
                            simulatedHealthRatio.status === 'warning' ? 'bg-warning-500' : 
                            'bg-error-500'
                          }`} 
                        />
                      </div>
                    </div>
                    
                    {activeTab === 'collateral' && selectedMarket && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500 dark:text-neutral-400">Supply APY</span>
                          <span className="font-medium text-success-600 dark:text-success-400">
                            {selectedMarket.supplyAPY.toFixed(2)}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500 dark:text-neutral-400">Collateral Factor</span>
                          <span className="font-medium">
                            {(selectedMarket.collateralFactor * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500 dark:text-neutral-400">Borrowing Power Added</span>
                          <span className="font-medium text-primary-600 dark:text-primary-400">
                            {formatCurrency(parseFloat(borrowAmount) * selectedAsset.price * selectedMarket.collateralFactor)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {activeTab === 'borrow' && selectedMarket && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500 dark:text-neutral-400">Borrow APY</span>
                          <span className="font-medium text-error-600 dark:text-error-400">
                            {selectedMarket.borrowAPY.toFixed(2)}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500 dark:text-neutral-400">Collateralization</span>
                          <span className="font-medium">
                            {(selectedMarket.collateralFactor * 100).toFixed(0)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Submit button */}
              <button
                type="submit"
                disabled={
                  isSubmitting || 
                  !selectedAsset || 
                  !borrowAmount || 
                  parseFloat(borrowAmount) <= 0 || 
                  (activeTab === 'collateral' && parseFloat(borrowAmount) > maxCollateralAmount) ||
                  (activeTab === 'borrow' && parseFloat(borrowAmount) > maxBorrowAmount) ||
                  (activeTab === 'repay' && parseFloat(borrowAmount) > maxRepayAmount)
                }
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg px-4 py-3 transition-all duration-200"
              >
                {isSubmitting
                  ? 'Processing...'
                  : activeTab === 'collateral'
                    ? 'Supply Collateral'
                    : activeTab === 'borrow'
                      ? 'Borrow'
                      : 'Repay'
                }
              </button>
            </form>
          </Card>
        </div>
        
        <div>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Account Overview</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Health Ratio</p>
                <HealthRatioGauge healthRatio={simulatedAmount > 0 ? simulatedHealthRatio : healthRatio} size="md" />
              </div>
              
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Borrowing Power</p>
                <p className="text-xl font-semibold">{formatCurrency(maxBorrowValue)}</p>
                <div className="mt-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500" 
                    style={{ 
                      width: `${totalCollateralValue > 0 
                        ? Math.min(100, (totalBorrowedValue / totalCollateralValue) * 100) 
                        : 0}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  <span>{formatCurrency(totalBorrowedValue)}</span>
                  <span>{formatCurrency(totalCollateralValue)}</span>
                </div>
              </div>
              
              {/* Collateral info */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-sm font-medium mb-2">Your Collateral</h3>
                {userPositions.filter(p => p.isCollateral && p.supplied > 0).length > 0 ? (
                  <div className="space-y-3">
                    {userPositions
                      .filter(p => p.isCollateral && p.supplied > 0)
                      .map(position => {
                        const market = markets.find(m => m.asset.id === position.asset.id);
                        return (
                          <div key={position.asset.id} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <img src={position.asset.icon} alt={position.asset.name} className="w-5 h-5 mr-2" />
                              <span className="text-sm font-medium">{position.asset.symbol}</span>
                            </div>
                            <div className="text-sm text-right">
                              <div>{formatNumber(position.supplied)}</div>
                              {market && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {(market.collateralFactor * 100).toFixed(0)}% LTV
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 flex items-start">
                    <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>Supply assets as collateral to start borrowing. Use the "Supply Collateral" tab above.</span>
                  </div>
                )}
              </div>
              
              {/* Borrowed assets */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-sm font-medium mb-2">Your Borrowed Assets</h3>
                {userPositions.filter(p => p.borrowed > 0).length > 0 ? (
                  <div className="space-y-3">
                    {userPositions
                      .filter(p => p.borrowed > 0)
                      .map(position => {
                        const market = markets.find(m => m.asset.id === position.asset.id);
                        return (
                          <div key={position.asset.id} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <img src={position.asset.icon} alt={position.asset.name} className="w-5 h-5 mr-2" />
                              <span className="text-sm font-medium">{position.asset.symbol}</span>
                            </div>
                            <div className="text-sm text-right">
                              <div>{formatNumber(position.borrowed)}</div>
                              {market && (
                                <div className="text-xs text-error-500">
                                  {market.borrowAPY.toFixed(2)}% APY
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    You have no borrowed assets.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Borrow;