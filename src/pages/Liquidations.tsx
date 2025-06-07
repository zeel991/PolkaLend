import React from 'react';
import Card from '../components/ui/Card';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/helpers';
import { ExternalLink, Info, ArrowRight } from 'lucide-react';
import { mockLiquidationOpportunities } from '../utils/mockData';
import { motion } from 'framer-motion';

const Liquidations: React.FC = () => {
  const { liquidatePosition } = useLending();
  const { status, selectedAccount } = useWallet();
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Use mock data for now
  const liquidationOpportunities = mockLiquidationOpportunities;
  
  const handleLiquidate = async (id: string) => {
    const opportunity = liquidationOpportunities.find(o => o.id === id);
    if (!opportunity) return;
    
    setIsLoading(true);
    try {
      await liquidatePosition(opportunity);
    } catch (error) {
      console.error('Liquidation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">Liquidations</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          View and participate in liquidation opportunities
        </p>
      </div>
      
      {status !== 'connected' ? (
        <Card className="p-8 text-center">
          <Info size={24} className="text-neutral-500 dark:text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Wallet to View Liquidations</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
            You need to connect your wallet to view and participate in liquidation opportunities.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-8 p-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <h2 className="text-lg font-semibold mb-4">How Liquidations Work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">1. Identify Opportunities</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Browse positions with health ratios below the liquidation threshold.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">2. Repay Debt</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Repay all or part of the borrowed assets to the protocol.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">3. Receive Collateral</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Receive the liquidated collateral at a discount, typically 5-10%.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold">Available Opportunities</h2>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Showing {liquidationOpportunities.length} positions
            </div>
          </div>
          
          {liquidationOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {liquidationOpportunities.map((opportunity) => (
                <motion.div 
                  key={opportunity.id}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-visible">
                    <div className="p-5 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                      <div>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">Borrower</span>
                        <div className="flex items-center mt-1">
                          <span className="font-medium">{shortenAddress(opportunity.borrower)}</span>
                          <a 
                            href={`https://polkadot.subscan.io/account/${opportunity.borrower}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-500 ml-1"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">Health Ratio</span>
                          <span className="text-error-600 dark:text-error-400 font-medium mt-1">
                            {opportunity.healthRatio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="text-sm font-medium mb-3 text-neutral-500 dark:text-neutral-400">Debt to Repay</h3>
                          <div className="flex items-center mb-2">
                            <img src={opportunity.debtAsset.icon} alt={opportunity.debtAsset.symbol} className="w-6 h-6 mr-2" />
                            <span className="font-medium">{formatNumber(opportunity.debtAmount)} {opportunity.debtAsset.symbol}</span>
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {formatCurrency(opportunity.debtAmount * opportunity.debtAsset.price)}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-3 text-neutral-500 dark:text-neutral-400">Collateral to Receive</h3>
                          <div className="flex items-center mb-2">
                            <img src={opportunity.collateralAsset.icon} alt={opportunity.collateralAsset.symbol} className="w-6 h-6 mr-2" />
                            <span className="font-medium">{formatNumber(opportunity.collateralAmount)} {opportunity.collateralAsset.symbol}</span>
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {formatCurrency(opportunity.collateralAmount * opportunity.collateralAsset.price)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg mb-4">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-success-700 dark:text-success-300">
                              Bonus: {(opportunity.discount * 100).toFixed(0)}% discount on collateral
                            </p>
                            <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                              ≈ {formatCurrency(
                                opportunity.collateralAmount * opportunity.collateralAsset.price * opportunity.discount
                              )} profit
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleLiquidate(opportunity.id)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg px-4 py-3 transition-all duration-200"
                      >
                        <span>Liquidate Position</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No Liquidation Opportunities</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                There are currently no positions available for liquidation. Check back later for new opportunities.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Liquidations;