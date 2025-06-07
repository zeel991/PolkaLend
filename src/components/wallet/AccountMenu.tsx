import React from 'react';
import { Copy, LogOut, ExternalLink } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';

interface AccountMenuProps {
  onClose: () => void;
}

const AccountMenu: React.FC<AccountMenuProps> = ({ onClose }) => {
  const { selectedAccount, disconnectWallet } = useWallet();
  
  if (!selectedAccount) return null;
  
  const copyAddress = () => {
    navigator.clipboard.writeText(selectedAccount.address);
    // Could add a toast notification here
  };
  
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const explorerUrl = `https://polkadot.subscan.io/account/${selectedAccount.address}`;
  
  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 "
      onClick={handleClickOutside}
    >
      <div className="w-72 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden text-white">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-300 font-medium">{selectedAccount.name.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {selectedAccount.name || 'My Wallet'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {formatAddress(selectedAccount.address)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <button
            onClick={copyAddress}
            className="w-full flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
          >
            <Copy size={16} />
            <span className="text-sm">Copy Address</span>
          </button>
          
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
          >
            <ExternalLink size={16} />
            <span className="text-sm">View on Explorer</span>
          </a>
          
          <button
            onClick={() => {
              disconnectWallet();
              onClose();
            }}
            className="w-full flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left text-red-500"
          >
            <LogOut size={16} />
            <span className="text-sm">Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountMenu;