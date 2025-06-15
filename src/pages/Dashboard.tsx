import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import HealthRatioGauge from '../components/ui/HealthRatioGauge';
import AssetRow from '../components/ui/AssetRow';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { Wallet, PlusCircle, MinusCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { getAccountAddress } from '../types/lending';

// FIXED: Use the same contract addresses as BorrowContainer
const WESTEND_RPC_URL = 'https://westend-asset-hub-eth-rpc.polkadot.io';
const ERC20_TOKEN_CONTRACT = '0x1FDe1cAeCe0C9d102C5736d2AdE595Dc6cE45f1c';
const LENDING_VAULT_CONTRACT = '0x61eB150FB07c6DD742893708e6B7D7a4161BcA0C';
const MOCK_ORACLE_CONTRACT = '0x05deF0eDF0ED1773F724A9Fe121Af64267C69204';

// ABIs
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const LENDING_VAULT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "vaults",
    "outputs": [
      {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "debtAmount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LTV",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const ORACLE_ABI = [
  {
    "inputs": [],
    "name": "getPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

interface RealContractData {
  // Token balance
  tokenBalance: number;
  tokenSymbol: string;
  
  // Oracle price
  oraclePrice: number;
  
  // Vault data
  collateralAmount: number;
  debtAmount: number;
  
  // Calculated values
  collateralValueUSD: number;
  maxBorrowableUSD: number;
  availableToBorrowUSD: number;
  netWorth: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

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
      scale: 1.05,
      y: -8,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    whileTap={{ scale: 0.98 }}
    className="group cursor-pointer"
  >
    <Card className={`
      p-6 relative overflow-hidden
      bg-gradient-to-br from-purple-50/80 to-pink-50/80 
      dark:from-purple-900/40 dark:to-pink-900/20 
      border border-purple-200/60 dark:border-purple-700/40
      backdrop-blur-sm shadow-lg
      hover:shadow-2xl hover:shadow-purple-500/25
      hover:border-purple-400/80 dark:hover:border-purple-500/60
      transform transition-all duration-300 ease-out
      hover:bg-gradient-to-br hover:from-purple-100/90 hover:to-pink-100/90
      dark:hover:from-purple-800/60 dark:hover:to-pink-800/40
      ${className}
    `}>
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-pink-400/0 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect */}
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

const Dashboard: React.FC = () => {
  // const { healthRatio, markets } = useLending();
  const { status, selectedAccount } = useWallet();
  
  // State for real contract data
  const [contractData, setContractData] = useState<RealContractData>({
    tokenBalance: 0,
    tokenSymbol: '',
    oraclePrice: 0,
    collateralAmount: 0,
    debtAmount: 0,
    collateralValueUSD: 0,
    maxBorrowableUSD: 0,
    availableToBorrowUSD: 0,
    netWorth: 0,
    isLoading: false,
    error: null
  });

  // Get Ethereum address from account
  const getEthereumAddress = (account: any): string => {
    try {
      const possibleAddresses = [
        account?.address,
        account?.meta?.source,
        account?.meta?.address, 
        account,
        getAccountAddress(account)
      ];
      
      for (const addr of possibleAddresses) {
        if (addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) {
          return addr;
        }
      }
      
      throw new Error(`No Ethereum-compatible address found.`);
    } catch (error) {
      throw error;
    }
  };

  // Fetch all real contract data
  const fetchRealContractData = async () => {
    if (!selectedAccount) {
      setContractData(prev => ({
        ...prev,
        tokenBalance: 0,
        tokenSymbol: '',
        oraclePrice: 0,
        collateralAmount: 0,
        debtAmount: 0,
        collateralValueUSD: 0,
        maxBorrowableUSD: 0,
        availableToBorrowUSD: 0,
        netWorth: 0,
        isLoading: false,
        error: null
      }));
      return;
    }

    setContractData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = new ethers.providers.JsonRpcProvider(WESTEND_RPC_URL);
      
      // Create contract instances
      const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, provider);
      const vaultContract = new ethers.Contract(LENDING_VAULT_CONTRACT, LENDING_VAULT_ABI, provider);
      const oracleContract = new ethers.Contract(MOCK_ORACLE_CONTRACT, ORACLE_ABI, provider);

      const userAddress = getEthereumAddress(selectedAccount);

      // Fetch all data in parallel
      const [
        tokenBalance,
        tokenDecimals,
        tokenSymbol,
        vaultData,
        ltv,
        oraclePrice
      ] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        tokenContract.decimals(),
        tokenContract.symbol(),
        vaultContract.vaults(userAddress),
        vaultContract.LTV(),
        oracleContract.getPrice()
      ]);

      // Parse token data
      const formattedTokenBalance = parseFloat(ethers.utils.formatUnits(tokenBalance, tokenDecimals));
      const formattedTokenSymbol = tokenSymbol;

      // Parse oracle price (FIXED: 18 decimals)
      const formattedOraclePrice = parseFloat(ethers.utils.formatUnits(oraclePrice, 18));

      // Parse vault data
      const collateralAmount = parseFloat(ethers.utils.formatUnits(vaultData.collateralAmount, tokenDecimals));
      const debtAmount = parseFloat(vaultData.debtAmount.toString());

      // Calculate derived values
      const collateralValueUSD = collateralAmount * formattedOraclePrice;
      const ltvPercent = parseFloat(ltv.toString());
      const maxBorrowableUSD = collateralValueUSD * (ltvPercent / 100);
      const availableToBorrowUSD = Math.max(0, maxBorrowableUSD - debtAmount);
      
      // Calculate net worth (wallet tokens + collateral - debt)
      const walletValueUSD = formattedTokenBalance * formattedOraclePrice;
      const netWorth = walletValueUSD + collateralValueUSD - debtAmount;

      setContractData({
        tokenBalance: formattedTokenBalance,
        tokenSymbol: formattedTokenSymbol,
        oraclePrice: formattedOraclePrice,
        collateralAmount: collateralAmount,
        debtAmount: debtAmount,
        collateralValueUSD: collateralValueUSD,
        maxBorrowableUSD: maxBorrowableUSD,
        availableToBorrowUSD: availableToBorrowUSD,
        netWorth: netWorth,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching contract data:', error);
      setContractData(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to fetch contract data: ${error}`
      }));
    }
  };

  // Fetch data when account changes
  useEffect(() => {
    fetchRealContractData();
  }, [selectedAccount]);

  // Calculate health ratio from real data
  const getRealHealthRatio = () => {
    if (contractData.debtAmount === 0) {
      return { value: 999, status: 'healthy' as const };
    }
    
    const healthValue = contractData.collateralValueUSD / contractData.debtAmount;
    
    if (healthValue >= 1.5) return { value: healthValue, status: 'healthy' as const };
    if (healthValue >= 1.1) return { value: healthValue, status: 'warning' as const };
    return { value: healthValue, status: 'danger' as const };
  };

  const realHealthRatio = getRealHealthRatio();
  const hasPositions = contractData.collateralAmount > 0 || contractData.debtAmount > 0 || contractData.tokenBalance > 0;

  if (!selectedAccount) {
    // User is not connected, show welcome screen
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold mb-4">Welcome to PolkaLend</h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Connect your wallet to start depositing collateral and borrowing assets.
          </p>
        </div>
        
        <div className="flex justify-center mt-10">
          <div className="bg-neutral-100 dark:bg-neutral-800 p-8 rounded-xl text-center max-w-md">
            <div className="mb-6 flex justify-center">
              <Wallet size={48} className="text-primary-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Please connect your Polkadot wallet to access the lending protocol.
            </p>
            {status === 'error' ? (
              <div className="text-sm text-red-500 mb-4">
                Failed to connect wallet. Please make sure you have a Polkadot wallet extension installed.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Your Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Real-time data from Westend Asset Hub contracts
          </p>
        </div>
        
        {hasPositions && (
          <motion.div 
            className="mt-4 md:mt-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <HealthRatioGauge healthRatio={realHealthRatio} />
          </motion.div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10 text-white">
        {/* Real Net Worth Card */}
        <AnimatedCard delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-200 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
              💰 Net Worth
            </h2>
            <motion.button
              onClick={fetchRealContractData}
              disabled={contractData.isLoading}
              className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors group-hover:scale-110"
              title="Refresh data"
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
            >
              <RefreshCw size={16} className={`text-purple-600 dark:text-purple-400 ${contractData.isLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
          
          {contractData.isLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">Loading...</span>
            </div>
          ) : contractData.error ? (
            <div className="text-red-500 text-sm">{contractData.error}</div>
          ) : (
            <>
              <motion.div 
                className="text-3xl font-bold mb-2 text-purple-900 dark:text-purple-100 group-hover:scale-110 transition-transform"
                whileHover={{ scale: 1.1 }}
              >
                {formatCurrency(contractData.netWorth)}
              </motion.div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Supplied</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(contractData.collateralValueUSD)}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Borrowed</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(contractData.debtAmount)}</p>
                </div>
              </div>
              
              {/* Wallet Token Balance */}
              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">💼 Wallet Balance</p>
                <p className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  {contractData.tokenBalance.toFixed(4)} {contractData.tokenSymbol}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  ≈ {formatCurrency(contractData.tokenBalance * contractData.oraclePrice)}
                </p>
              </div>
            </>
          )}
        </AnimatedCard>
        
        {/* Real Oracle Price Card */}
        <AnimatedCard delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-200 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
              📊 Oracle Price
            </h2>
            <motion.button
              onClick={fetchRealContractData}
              disabled={contractData.isLoading}
              className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors group-hover:scale-110"
              title="Refresh price"
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
            >
              <RefreshCw size={16} className={`text-purple-600 dark:text-purple-400 ${contractData.isLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
          
          {contractData.isLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">Loading...</span>
            </div>
          ) : contractData.error ? (
            <div className="text-red-500 text-sm">{contractData.error}</div>
          ) : (
            <>
              <motion.div 
                className="text-3xl font-bold mb-2 text-purple-900 dark:text-purple-100 group-hover:scale-110 transition-transform"
                whileHover={{ scale: 1.1 }}
              >
                ${contractData.oraclePrice.toFixed(2)}
              </motion.div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Token</p>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">{contractData.tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Network</p>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">🌐 Westend Asset Hub</p>
                </div>
              </div>
            </>
          )}
        </AnimatedCard>
        
        {/* Real Borrowing Power Card */}
        <AnimatedCard delay={0.3}>
          <h2 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
            ⚡ Borrowing Power
          </h2>
          
          {contractData.isLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">Loading...</span>
            </div>
          ) : contractData.error ? (
            <div className="text-red-500 text-sm">{contractData.error}</div>
          ) : (
            <>
              <motion.div 
                className="text-3xl font-bold mb-2 text-purple-900 dark:text-purple-100 group-hover:scale-110 transition-transform"
                whileHover={{ scale: 1.1 }}
              >
                {formatCurrency(contractData.availableToBorrowUSD)}
              </motion.div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                Available to borrow (75% LTV)
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-600 dark:text-purple-400">Max Borrowable:</span>
                  <span className="text-purple-800 dark:text-purple-200">{formatCurrency(contractData.maxBorrowableUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600 dark:text-purple-400">Currently Borrowed:</span>
                  <span className="text-purple-800 dark:text-purple-200">{formatCurrency(contractData.debtAmount)}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    to="/borrow"
                    className="w-full flex items-center justify-center space-x-1 
                             bg-gradient-to-r from-purple-500 to-pink-500 
                             hover:from-purple-600 hover:to-pink-600 
                             text-white font-medium rounded-lg px-4 py-2 
                             transition-all duration-200 shadow-lg hover:shadow-xl
                             transform group-hover:scale-105"
                  >
                    <span>Borrow Now</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              </div>
            </>
          )}
        </AnimatedCard>
        
        {/* Real Health Status Card */}
        <AnimatedCard delay={0.4}>
          <h2 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
            ❤️ Health Status
          </h2>
          
          {!hasPositions ? (
            <div className="flex flex-col items-center justify-center h-32">
              <p className="text-purple-600 dark:text-purple-400 text-center">
                You have no active positions yet.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  to="/markets"
                  className="mt-4 inline-flex items-center text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 font-medium"
                >
                  <span>🚀 Explore markets</span>
                  <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div 
                className="p-3 rounded-lg bg-purple-100/80 dark:bg-purple-800/40 border border-purple-200 dark:border-purple-700"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                  ⚠️ Liquidation at
                </p>
                <p className="text-lg font-medium text-purple-900 dark:text-purple-100">&lt; 1.0 Health Ratio</p>
              </motion.div>
              
              <motion.div 
                className="p-3 rounded-lg bg-purple-100/80 dark:bg-purple-800/40 border border-purple-200 dark:border-purple-700"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                  📈 Current health ratio
                </p>
                <p className={`text-lg font-medium ${
                  realHealthRatio.status === 'healthy' ? 'text-green-600 dark:text-green-400' : 
                  realHealthRatio.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-red-600 dark:text-red-400'
                }`}>
                  {realHealthRatio.value === 999 ? '∞' : realHealthRatio.value.toFixed(2)}
                </p>
              </motion.div>
              
              {contractData.collateralAmount > 0 && (
                <motion.div 
                  className="p-3 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                    🔒 Collateral Deposited
                  </p>
                  <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
                    {contractData.collateralAmount.toFixed(4)} {contractData.tokenSymbol}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </AnimatedCard>
      </div>
      
      {/* Real Position Summary */}
      {hasPositions && (
        <motion.div 
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold">📊 Your Position Summary</h2>
            <motion.button
              onClick={fetchRealContractData}
              disabled={contractData.isLoading}
              className="text-purple-500 hover:text-purple-600 text-sm font-medium flex items-center
                         hover:bg-purple-100/20 dark:hover:bg-purple-900/20 px-3 py-1 rounded-lg transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={16} className={`mr-1 ${contractData.isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </motion.button>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="p-6 bg-gradient-to-br from-purple-50/60 to-pink-50/60 
                           dark:from-purple-900/30 dark:to-pink-900/20 
                           border border-purple-200/60 dark:border-purple-700/40
                           hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <h3 className="text-sm text-purple-600 dark:text-purple-400 mb-2">💎 Collateral Supplied</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {contractData.collateralAmount.toFixed(4)} {contractData.tokenSymbol}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    ≈ {formatCurrency(contractData.collateralValueUSD)}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <h3 className="text-sm text-purple-600 dark:text-purple-400 mb-2">💳 Total Borrowed</h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(contractData.debtAmount)}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">USD</p>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <h3 className="text-sm text-purple-600 dark:text-purple-400 mb-2">⚡ Available to Borrow</h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(contractData.availableToBorrowUSD)}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">USD</p>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;