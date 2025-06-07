import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import WalletButton from '../wallet/WalletButton';
import AccountMenu from '../wallet/AccountMenu';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { selectedAccount } = useWallet();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Markets', path: '/markets' },
    { name: 'Borrow', path: '/borrow' },
    { name: 'Liquidations', path: '/liquidations' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-sm bg-white/70 dark:bg-neutral-900/70 border-b border-neutral-200 dark:border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and desktop navigation */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/polkadot-logo.svg" alt="PolkaLend" className="h-8 w-8" />
              <span className="font-heading text-xl font-semibold text-primary-500">PolkaLend</span>
            </Link>
            
            {/* Desktop navigation */}
            <nav className="ml-10 hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`font-medium text-sm ${
                    isActive(item.path)
                      ? 'text-primary-500'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-primary-500 dark:hover:text-primary-400'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          
          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {selectedAccount ? (
              <div className="relative">
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center space-x-2 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700 text-white"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="max-w-[100px] truncate">{selectedAccount.address.substring(0, 6)}...{selectedAccount.address.substring(selectedAccount.address.length - 4)}</span>
                  <ChevronDown size={14} />
                </button>
                
                {isAccountMenuOpen && (
                  <AccountMenu onClose={() => setIsAccountMenuOpen(false)} />
                )}
              </div>
            ) : (
              <WalletButton />
            )}
            
            {/* Mobile menu button */}
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-500 md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.path)
                    ? 'bg-primary-100 text-primary-500 dark:bg-primary-900 dark:text-primary-400'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;