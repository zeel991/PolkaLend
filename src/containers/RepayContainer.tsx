import React from 'react';
import { useLending } from '../contexts/LendingContext';
import { formatCurrency, formatNumber, addCommasToNumber } from '../utils/helpers';
import { AlertCircle, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContainerProps, AssetWithBalance } from '../types/lending';

interface RepayContainerProps extends ContainerProps {
  availableAssets: any[];
  isAssetMenuOpen: boolean;
  setIsAssetMenuOpen: (open: boolean) => void;
  maxRepayAmount: number;
  healthRatio: any;
  simulatedHealthRatio: any;
}

const RepayContainer: React.FC<RepayContainerProps> = ({
  selectedAsset,
  setSelectedAsset,
  borrowAmount,
  setBorrowAmount,
  isSubmitting,
  setIsSubmitting,
  error,
  setError,
  availableAssets,
  isAssetMenuOpen,
  setIsAssetMenuOpen,
  maxRepayAmount,
  healthRatio,
  simulatedHealthRatio,
  onTransactionComplete
}) => {
  const { markets, repayLoan } = useLending();

  // Get selected market info
  const selectedMarket = selectedAsset ? markets.find(m => m.asset.id === selectedAsset.id) : null;

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
    setBorrowAmount(maxRepayAmount.toFixed(4));
  };

  // Handle repay submission
  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset) return;
    
    const amount = parseFloat(borrowAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > maxRepayAmount) {
      setError('Amount exceeds your borrowed balance');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await repayLoan(selectedAsset, amount);
      
      setBorrowAmount('');
      onTransactionComplete?.();
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      console.error('Repay error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Tab Description */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <Info size={16} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Repay:</strong> Repay your borrowed assets to reduce debt and 
            improve your health ratio. This will help protect you from liquidation.
          </div>
        </div>
      </div>
      
      <form onSubmit={handleRepay}>
        {/* Asset selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Asset to Repay
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
                  {availableAssets.map((position) => {
                    const asset = position.asset;
                    const market = markets.find(m => m.asset.id === asset.id);
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
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatNumber(position.borrowed)}
                          </div>
                          {market && (
                            <div className="text-xs text-error-500">
                              {market.borrowAPY.toFixed(2)}% APY
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {availableAssets.length === 0 && (
                    <div className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                      No borrowed assets to repay
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
              Repay Amount
            </label>
            
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center space-x-2">
              <span>
                Borrowed: <span className="font-medium">{formatNumber(maxRepayAmount)} USD</span>
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
        {selectedAsset && borrowAmount && !isNaN(parseFloat(borrowAmount)) && parseFloat(borrowAmount) > 0 && selectedMarket && (
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">Repay Preview</h3>
            
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
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Current Debt</span>
                <span className="font-medium text-error-600 dark:text-error-400">
                  {formatNumber(maxRepayAmount)} {selectedAsset.symbol}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Repay Amount</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  {formatNumber(parseFloat(borrowAmount))} {selectedAsset.symbol}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Remaining Debt</span>
                <span className="font-medium">
                  {formatNumber(Math.max(0, maxRepayAmount - parseFloat(borrowAmount)))} {selectedAsset.symbol}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Interest Saved</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  {((parseFloat(borrowAmount) * selectedAsset.price * selectedMarket.borrowAPY) / 100).toFixed(2)} USD/year
                </span>
              </div>
              
              {parseFloat(borrowAmount) >= maxRepayAmount && (
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-800 dark:text-green-200">
                    ✅ This will fully repay your {selectedAsset.symbol} debt and eliminate interest charges.
                  </p>
                </div>
              )}
              
              {simulatedHealthRatio.value > healthRatio.value && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    📈 Repaying will improve your health factor and reduce liquidation risk.
                  </p>
                </div>
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
            parseFloat(borrowAmount) > maxRepayAmount
          }
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg px-4 py-3 transition-all duration-200"
        >
          {isSubmitting ? 'Processing...' : 'Repay Loan'}
        </button>
      </form>
    </div>
  );
};

export default RepayContainer;