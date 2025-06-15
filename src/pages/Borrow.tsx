import React, { useState, useEffect } from 'react';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import Card from '../components/ui/Card';
import HealthRatioGauge from '../components/ui/HealthRatioGauge';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { Info } from 'lucide-react';
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
  DOT_TOKEN_CONTRACT,
  LENDING_VAULT_CONTRACT,
  getAccountAddress,
  toNumber
} from '../types/lending';

const Borrow: React.FC = () => {
  // Data hooks
  const { 
    netWorth, 
    oraclePrice,
    tokenBalance,
    isLoading
  } = useLendingData();

  const { 
    markets, 
    userPositions, 
    healthRatio, 
    borrowAsset, 
    repayLoan
  } = useLending();
  
  const { status, selectedAccount } = useWallet();

  // UI state
  const [selectedAsset, setSelectedAsset] = useState<AssetWithBalance | null>(null);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LendingTab>('approve');
  
  // Approval tracking state
  const [approvals, setApprovals] = useState<ApprovalState>({});
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);

  // Get stablecoins (for default selection)
  const stablecoins = markets.filter(market => market.asset.isStablecoin);

  // Fake DOT token for demo
  const fakeDotToken: AssetWithBalance = {
    id: 'dot-token',
    symbol: 'DOT',
    name: 'Polkadot',
    icon: '../utils/logos/dot.png',
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
    setActiveTab(tab);
    setBorrowAmount('');
    setError(null);
    setIsAssetMenuOpen(false);
  };

  // Handle transaction complete
  const handleTransactionComplete = () => {
    // Refresh data or trigger updates as needed
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

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl text-center text-white">
        <h1 className="text-3xl font-heading font-bold mb-4">Loading...</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-8">
          Please wait while we load your lending data.
        </p>
      </div>
    );
  }

  // Wallet not connected
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
            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-6">
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'approve'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => handleTabChange('approve')}
              >
                Approve Token
              </button>
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'collateral'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => handleTabChange('collateral')}
              >
                Supply Collateral
              </button>
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'borrow'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => handleTabChange('borrow')}
              >
                Borrow
              </button>
              <button
                className={`pb-3 px-4 font-medium text-sm ${
                  activeTab === 'repay'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                onClick={() => handleTabChange('repay')}
              >
                Repay
              </button>
            </div>
            
            {/* Tab Content */}
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
          </Card>
        </div>
        
        {/* Sidebar */}
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
              
              {/* Token Approvals */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Token Approvals</h3>
                  <button
                    onClick={() => setShowApprovalHistory(!showApprovalHistory)}
                    className="text-xs text-primary-500 hover:text-primary-600"
                  >
                    {showApprovalHistory ? 'Hide' : 'Show All'}
                  </button>
                </div>
                
                {getCurrentAccountApprovals().length > 0 ? (
                  <div className="space-y-3">
                    {getCurrentAccountApprovals()
                      .slice(0, showApprovalHistory ? undefined : 3)
                      .map((approval: TokenApproval) => (
                        <div key={approval.asset.id} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <img src={approval.asset.icon} alt={approval.asset.name} className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">{approval.asset.symbol}</span>
                          </div>
                          <div className="text-sm text-right">
                            <div className="text-green-600 dark:text-green-400">
                              {formatNumber(approval.amount)}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {approval.timestamp.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {getCurrentAccountApprovals().length > 3 && !showApprovalHistory && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                        +{getCurrentAccountApprovals().length - 3} more approvals
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 flex items-start">
                    <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>No token approvals yet. Use the "Approve Token" tab to grant permissions.</span>
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