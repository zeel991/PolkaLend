import React from 'react';
import { Asset } from '../../types';
import { formatNumber, formatCurrency } from '../../utils/helpers';

interface AssetRowProps {
  asset: Asset;
  balance?: number;
  value?: number;
  apy?: number;
  onClick?: () => void;
  actions?: React.ReactNode;
}

const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  balance,
  value,
  apy,
  onClick,
  actions
}) => {
  return (
    <div 
      className={`flex items-center p-4 border-b border-neutral-100 dark:border-neutral-800 ${onClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-850' : ''}`}
      onClick={onClick}
    >
      {/* Asset icon and name */}
      <div className="flex items-center flex-1">
        <img src={asset.icon} alt={asset.name} className="w-8 h-8 mr-3" />
        <div>
          <div className="font-medium">{asset.symbol}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{asset.name}</div>
        </div>
      </div>
      
      {/* Balance - if provided */}
      {balance !== undefined && (
        <div className="flex-1 text-right">
          <div className="font-medium">{formatNumber(balance)}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {value !== undefined && formatCurrency(value)}
          </div>
        </div>
      )}
      
      {/* APY - if provided */}
      {apy !== undefined && (
        <div className="flex-1 text-right">
          <div className="font-medium text-success-600 dark:text-success-500">{apy.toFixed(2)}%</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">APY</div>
        </div>
      )}
      
      {/* Actions */}
      {actions && (
        <div className="ml-4">
          {actions}
        </div>
      )}
    </div>
  );
};

export default AssetRow;