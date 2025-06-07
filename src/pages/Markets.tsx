import React, { useState } from 'react';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import Card from '../components/ui/Card';
import { Info, ChevronDown, Search } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/helpers';

const Markets: React.FC = () => {
  const { markets } = useLending();
  const { status } = useWallet();
  const [sortColumn, setSortColumn] = useState<string>('asset');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterQuery, setFilterQuery] = useState<string>('');
  
  // Filter markets based on search query
  const filteredMarkets = markets.filter(market => {
    const { name, symbol } = market.asset;
    const query = filterQuery.toLowerCase();
    return name.toLowerCase().includes(query) || symbol.toLowerCase().includes(query);
  });
  
  // Sort markets
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'asset':
        comparison = a.asset.symbol.localeCompare(b.asset.symbol);
        break;
      case 'totalSupplied':
        comparison = a.totalSupplied * a.asset.price - b.totalSupplied * b.asset.price;
        break;
      case 'supplyAPY':
        comparison = a.supplyAPY - b.supplyAPY;
        break;
      case 'totalBorrowed':
        comparison = a.totalBorrowed * a.asset.price - b.totalBorrowed * b.asset.price;
        break;
      case 'borrowAPY':
        comparison = a.borrowAPY - b.borrowAPY;
        break;
      case 'ltv':
        comparison = a.collateralFactor - b.collateralFactor;
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Toggle sort
  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    
    return (
      <ChevronDown 
        size={14} 
        className={`ml-1 transition-transform ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
      />
    );
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">Markets</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          View all available assets, supply and borrow rates
        </p>
      </div>
      
      {status !== 'connected' && (
        <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700/30 rounded-lg p-4 mb-8 flex items-start">
          <Info size={18} className="text-warning-600 dark:text-warning-400 mr-3 mt-0.5" />
          <div>
            <p className="text-warning-800 dark:text-warning-300 font-medium">Wallet not connected</p>
            <p className="text-warning-700 dark:text-warning-400 text-sm mt-1">
              Connect your wallet to deposit collateral and borrow assets.
            </p>
          </div>
        </div>
      )}
      
      <Card className="mb-8">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search markets..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800"
              />
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="hidden sm:inline">Assets:</span>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  All
                </button>
                <button className="px-3 py-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  Stablecoins
                </button>
                <button className="px-3 py-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  Ecosystem
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                <th 
                  className="p-4 font-medium cursor-pointer"
                  onClick={() => toggleSort('asset')}
                >
                  <div className="flex items-center">
                    Asset
                    {renderSortIndicator('asset')}
                  </div>
                </th>
                <th 
                  className="p-4 font-medium cursor-pointer"
                  onClick={() => toggleSort('totalSupplied')}
                >
                  <div className="flex items-center">
                    Total Supplied
                    {renderSortIndicator('totalSupplied')}
                  </div>
                </th>
                <th 
                  className="p-4 font-medium cursor-pointer"
                  onClick={() => toggleSort('supplyAPY')}
                >
                  <div className="flex items-center">
                    Supply APY
                    {renderSortIndicator('supplyAPY')}
                  </div>
                </th>
                <th 
                  className="p-4 font-medium cursor-pointer"
                  onClick={() => toggleSort('totalBorrowed')}
                >
                  <div className="flex items-center">
                    Total Borrowed
                    {renderSortIndicator('totalBorrowed')}
                  </div>
                </th>
                <th 
                  className="p-4 font-medium cursor-pointer"
                  onClick={() => toggleSort('borrowAPY')}
                >
                  <div className="flex items-center">
                    Borrow APY
                    {renderSortIndicator('borrowAPY')}
                  </div>
                </th>
                <th 
                  className="p-4 font-medium cursor-pointer"
                  onClick={() => toggleSort('ltv')}
                >
                  <div className="flex items-center">
                    Collateral LTV
                    {renderSortIndicator('ltv')}
                  </div>
                </th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMarkets.map((market) => (
                <tr 
                  key={market.asset.id} 
                  className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-850 hover:text-black"
                >
                  <td className="p-4">
                    <div className="flex items-center">
                      <img src={market.asset.icon} alt={market.asset.name} className="w-8 h-8 mr-3" />
                      <div>
                        <div className="font-medium">{market.asset.symbol}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{market.asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{formatCurrency(market.totalSupplied * market.asset.price)}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{formatNumber(market.totalSupplied)} {market.asset.symbol}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-success-600 dark:text-success-500">{market.supplyAPY.toFixed(2)}%</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{formatCurrency(market.totalBorrowed * market.asset.price)}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{formatNumber(market.totalBorrowed)} {market.asset.symbol}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-error-600 dark:text-error-500">{market.borrowAPY.toFixed(2)}%</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{(market.collateralFactor * 100).toFixed(0)}%</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex space-x-2 justify-end">
                      <button
                        disabled={status !== 'connected'} 
                        className="bg-secondary-500 hover:bg-secondary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg px-3 py-1 text-sm transition-all duration-200"
                      >
                        Supply
                      </button>
                      <button
                        disabled={status !== 'connected'} 
                        className="bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg px-3 py-1 text-sm transition-all duration-200"
                      >
                        Borrow
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {sortedMarkets.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                    No markets found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Markets;