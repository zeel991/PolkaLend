import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Card from '../components/ui/Card';
import { useLending } from '../contexts/LendingContext';
import { useWallet } from '../contexts/WalletContext';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/helpers';
import { ExternalLink, Info, ArrowRight, RefreshCw, AlertCircle, TrendingDown, Play, Square, Bell, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccountAddress } from '../types/lending';

// TypeScript declarations for Talisman wallet
declare global {
  interface Window {
    talismanEth?: any;
    ethereum?: any & {
      isTalisman?: boolean;
    };
  }
}

// Contract Configuration for Westend Asset Hub
const CONTRACT_CONFIG = {
  RPC_URL: 'https://westend-asset-hub-eth-rpc.polkadot.io',
  ORACLE_ADDRESS: '0x213FbC67BC1A3fe7FA5874760Fd4Be1838AF7f37',
  LENDING_VAULT_ADDRESS: '0x2E8025746f385dA2d882467D2ED05df6b8Bb5A44',
  LIQUIDATION_THRESHOLD: ethers.BigNumber.from('100000000000000000000'), // 100 * 10^18
  LIQUIDATION_DISCOUNT: 0.05, // 5% discount (pay 95%, get 100%)
};

// CORRECTED Oracle ABI
const ORACLE_ABI = [
  {
    "inputs": [],
    "name": "getPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "newPrice", "type": "uint256"}],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "oldPrice", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "newPrice", "type": "uint256"}
    ],
    "name": "PriceUpdated",
    "type": "event"
  }
];

// CORRECTED Lending Vault ABI (matches your actual contract)
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
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getHealthRatio",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getBorrowerDetails",
    "outputs": [
      {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "debtAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "healthRatio", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralValueUSD", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "repayAmountUSD", "type": "uint256"}
    ],
    "name": "liquidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllBorrowers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBorrowerCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LTV",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LIQUIDATION_THRESHOLD",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountUSD", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "stablecoinAmount", "type": "uint256"}
    ],
    "name": "Borrowed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "liquidator", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "repayAmountUSD", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "collateralReceived", "type": "uint256"}
    ],
    "name": "Liquidated",
    "type": "event"
  }
];

interface LiquidationOpportunity {
  id: string;
  borrower: string;
  healthRatio: ethers.BigNumber;
  healthRatioFormatted: number;
  collateralAmount: number; // DOT tokens
  collateralValueUSD: number; // DOT tokens * oracle price
  youPay: number; // 95% of collateral value
  youReceive: number; // 100% of collateral value  
  profit: number; // 5% profit
  debtAsset: {
    symbol: string;
    icon: string;
    price: number;
  };
  collateralAsset: {
    symbol: string;
    icon: string;
    price: number;
  };
  lastUpdated: Date;
}

const Liquidations: React.FC = () => {
  const { liquidatePosition } = useLending();
  const { status, selectedAccount } = useWallet();
  
  // State management
  const [liquidationOpportunities, setLiquidationOpportunities] = useState<LiquidationOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [borrowers, setBorrowers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<Array<{price: number, timestamp: Date}>>([]);
  const [eventCount, setEventCount] = useState<number>(0);
  const [liquidationCount, setLiquidationCount] = useState<number>(0);

  // Contract instances
  const [oracleContract, setOracleContract] = useState<ethers.Contract | null>(null);
  const [lendingVaultContract, setLendingVaultContract] = useState<ethers.Contract | null>(null);
  const [wsProvider, setWsProvider] = useState<ethers.providers.WebSocketProvider | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

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

  const initializeContracts = async () => {
    setIsInitializing(true);
    try {
      console.log('🔍 Checking wallet connection...');
      console.log('Selected account:', selectedAccount);
      
      if (!selectedAccount) {
        const errorMsg = 'No wallet account selected';
        console.log('❌', errorMsg);
        setError('Please connect your wallet first to access liquidation features.');
        return;
      }

      console.log('✅ Wallet account verified');
      console.log('🔧 Initializing contracts for Westend Asset Hub...');
      console.log('Oracle Address:', CONTRACT_CONFIG.ORACLE_ADDRESS);
      console.log('Vault Address:', CONTRACT_CONFIG.LENDING_VAULT_ADDRESS);
      
      const westendProvider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.RPC_URL);
      
      // Test network connection
      try {
        const network = await westendProvider.getNetwork();
        console.log('Connected to network:', network.name, 'Chain ID:', network.chainId.toString());
      } catch (networkError) {
        console.error('❌ Network connection failed:', networkError);
        throw new Error('Failed to connect to Westend Asset Hub RPC');
      }
      
      const oracle = new ethers.Contract(CONTRACT_CONFIG.ORACLE_ADDRESS, ORACLE_ABI, westendProvider);
      const vault = new ethers.Contract(CONTRACT_CONFIG.LENDING_VAULT_ADDRESS, LENDING_VAULT_ABI, westendProvider);
      
      // Test contract connections with timeout
      try {
        console.log('🔍 Testing Oracle contract connection...');
        const currentPrice = await Promise.race([
          oracle.getPrice(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        console.log('✅ Oracle contract connected, current price:', ethers.utils.formatUnits(currentPrice as ethers.BigNumber, 18));
      } catch (err) {
        console.error('❌ Oracle contract connection failed:', err);
        throw new Error(`Failed to connect to Oracle contract: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      try {
        console.log('🔍 Testing Vault contract connection...');
        const borrowerCount = await Promise.race([
          vault.getBorrowerCount(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        console.log('✅ Vault contract connected, borrower count:', borrowerCount.toString());
      } catch (err) {
        console.error('❌ Vault contract connection failed:', err);
        throw new Error(`Failed to connect to Lending Vault contract: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      // Set contracts only after successful testing
      setOracleContract(oracle);
      setLendingVaultContract(vault);

      // Initialize WebSocket provider for events (if available)
      try {
        console.log('ℹ️ WebSocket not configured, using polling method');
      } catch (wsError) {
        console.warn('⚠️ WebSocket initialization failed, will use polling fallback');
        setWsProvider(null);
      }

      setError(null);
      console.log('✅ All contracts initialized successfully');
    } catch (err: any) {
      const errorMessage = `Failed to initialize contracts: ${err.message}`;
      setError(errorMessage);
      console.error('Contract initialization error:', err);
      
      // Clear any partially set contracts
      setOracleContract(null);
      setLendingVaultContract(null);
      setWsProvider(null);
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize contracts when account is available
  useEffect(() => {
    if (selectedAccount) {
      initializeContracts();
    } else {
      cleanup();
    }
  }, [selectedAccount]);

  // Auto-start monitoring when contracts are ready
  useEffect(() => {
    if (oracleContract && lendingVaultContract && selectedAccount && !isMonitoring && !isLoading && !isInitializing) {
      console.log('✅ All conditions met for auto-start monitoring');
      handleStartMonitoring();
    }
  }, [oracleContract, lendingVaultContract, selectedAccount, isMonitoring, isLoading, isInitializing]);

  const handleStartMonitoring = async () => {
    if (!oracleContract || !lendingVaultContract || isMonitoring) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Starting liquidation monitoring...');

      // Get current price (Oracle returns price with 18 decimals)
      const price = await oracleContract.getPrice();
      const priceFormatted = parseFloat(ethers.utils.formatUnits(price, 18));
      setCurrentPrice(priceFormatted);
      setLastPriceUpdate(new Date());

      // Load all borrowers and check for liquidations
      await refreshData();

      // Set up price monitoring (polling since no WebSocket)
      setupPollingFallback();

      setIsMonitoring(true);
      console.log('✅ Liquidation monitoring started');
    } catch (err: any) {
      setError(`Failed to start monitoring: ${err.message}`);
      console.error('Monitoring error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATED: Main refresh function with CORRECT CALCULATIONS
  const refreshData = async () => {
    if (!lendingVaultContract) {
      console.log('❌ Lending vault contract not available - initializing contracts first...');
      setError('Contracts not initialized. Please wait or try connecting wallet again.');
      
      if (selectedAccount) {
        console.log('🔄 Attempting to initialize contracts...');
        await initializeContracts();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!lendingVaultContract) {
          console.log('❌ Contract initialization failed');
          setError('Failed to initialize contracts. Please check your connection and try again.');
          return;
        }
      } else {
        console.log('❌ Wallet not connected');
        setError('Please connect your wallet first.');
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Refreshing borrower data...');

      // Step 1: Get all borrowers from the contract
      console.log('📋 Calling getAllBorrowers...');
      const allBorrowers = await lendingVaultContract.getAllBorrowers();
      
      console.log(`✅ Found ${allBorrowers.length} borrowers:`, allBorrowers);
      setBorrowers(allBorrowers);

      if (allBorrowers.length === 0) {
        console.log('ℹ️ No borrowers found');
        setLiquidationOpportunities([]);
        return;
      }

      // Step 2: Get current price for calculations
      let currentPriceValue = currentPrice;
      if (oracleContract && currentPriceValue === 0) {
        const price = await oracleContract.getPrice();
        currentPriceValue = parseFloat(ethers.utils.formatUnits(price, 18));
        setCurrentPrice(currentPriceValue);
      }

      // Step 3: Check each borrower's health ratio
      console.log('🏥 Checking health ratios for all borrowers...');
      const liquidationOpportunities: LiquidationOpportunity[] = [];

      for (let i = 0; i < allBorrowers.length; i++) {
        const borrowerAddress = allBorrowers[i];
        console.log(`\n📊 Checking borrower ${i + 1}/${allBorrowers.length}: ${borrowerAddress}`);

        try {
          // Call getBorrowerDetails for this address
          const [collateralAmount, debtAmount, healthRatio, collateralValueUSD] = 
            await lendingVaultContract.getBorrowerDetails(borrowerAddress);

          console.log(`  Collateral: ${ethers.utils.formatUnits(collateralAmount, 18)} DOT`);
          console.log(`  Debt: ${debtAmount.toString()} USD`);
          console.log(`  Health Ratio: ${healthRatio.toString()}`);
          console.log(`  Collateral Value USD: ${collateralValueUSD.toString()}`);

          // Skip if no debt
          if (debtAmount.eq(0)) {
            console.log(`  ✅ No debt, skipping`);
            continue;
          }

          // Check if health ratio is below threshold (100 * 10^18)
          const isLiquidatable = healthRatio.lt(CONTRACT_CONFIG.LIQUIDATION_THRESHOLD);
          
          console.log(`  Health Ratio Check: ${healthRatio.toString()} < ${CONTRACT_CONFIG.LIQUIDATION_THRESHOLD.toString()} = ${isLiquidatable}`);

          if (isLiquidatable) {
            console.log(`  🚨 LIQUIDATABLE POSITION FOUND!`);
            
            // CORRECTED CALCULATIONS
            const collateralAmountFormatted = Number(ethers.utils.formatUnits(collateralAmount, 18)); // DOT tokens
            const healthRatioFormatted = Number(ethers.utils.formatUnits(healthRatio, 18));
            
            // Calculate based on collateral value, not debt
            const collateralValueUSDCalculated = collateralAmountFormatted * currentPriceValue; // DOT tokens * oracle price
            const youPay = collateralValueUSDCalculated * 0.95; // Pay 95% of collateral value
            const youReceive = collateralValueUSDCalculated; // Receive 100% of collateral value
            const profit = youReceive - youPay; // 5% profit
            
            console.log(`  💰 Corrected Calculations:`);
            console.log(`    Collateral Amount: ${collateralAmountFormatted} DOT`);
            console.log(`    Oracle Price: $${currentPriceValue}`);
            console.log(`    Collateral Value: $${collateralValueUSDCalculated}`);
            console.log(`    You Pay (95%): $${youPay}`);
            console.log(`    You Receive (100%): $${youReceive}`);
            console.log(`    Profit (5%): $${profit}`);
            
            const opportunity: LiquidationOpportunity = {
              id: `${borrowerAddress}-${Date.now()}`,
              borrower: borrowerAddress,
              healthRatio: healthRatio,
              healthRatioFormatted: healthRatioFormatted,
              collateralAmount: collateralAmountFormatted,
              collateralValueUSD: collateralValueUSDCalculated,
              youPay: youPay,
              youReceive: youReceive,
              profit: profit,
              debtAsset: {
                symbol: 'USD',
                icon: '/assets/usd.png',
                price: 1
              },
              collateralAsset: {
                symbol: 'DOT',
                icon: '/assets/download.svg',
                price: currentPriceValue
              },
              lastUpdated: new Date()
            };

            liquidationOpportunities.push(opportunity);
            console.log(`  ✅ Added to liquidation opportunities`);
          } else {
            console.log(`  ✅ Healthy position`);
          }

        } catch (err) {
          console.error(`  ❌ Error checking borrower ${borrowerAddress}:`, err);
        }
      }

      // Update state with found opportunities
      setLiquidationOpportunities(liquidationOpportunities);
      
      console.log(`\n🎯 SUMMARY:`);
      console.log(`📊 Total borrowers checked: ${allBorrowers.length}`);
      console.log(`🚨 Liquidatable positions found: ${liquidationOpportunities.length}`);
      
      if (liquidationOpportunities.length > 0) {
        console.log(`💰 Total potential profit: $${liquidationOpportunities.reduce((sum, opp) => sum + opp.profit, 0).toFixed(2)}`);
        liquidationOpportunities.forEach((opp, index) => {
          console.log(`  ${index + 1}. ${opp.borrower} - Health: ${opp.healthRatioFormatted.toFixed(4)} - Profit: $${opp.profit.toFixed(2)}`);
        });
      }

    } catch (err: any) {
      console.error('❌ Error refreshing data:', err);
      setError(`Failed to refresh data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const setupPollingFallback = () => {
    console.log('🔄 Setting up polling fallback for price monitoring...');
    
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    const interval = setInterval(async () => {
      if (!oracleContract || !isMonitoring) return;

      try {
        const price = await oracleContract.getPrice();
        const newPriceFormatted = parseFloat(ethers.utils.formatUnits(price, 18));
        
        // Check if price changed significantly
        if (Math.abs(newPriceFormatted - currentPrice) > 0.0001) {
          const timestamp = new Date();
          
          console.log('💱 PRICE CHANGE DETECTED VIA POLLING!');
          console.log(`📊 Price: ${currentPrice.toFixed(4)} → ${newPriceFormatted.toFixed(4)}`);
          
          setCurrentPrice(newPriceFormatted);
          setLastPriceUpdate(timestamp);
          setEventCount(prev => prev + 1);
          
          // Update price history
          setPriceHistory(prev => [...prev.slice(-9), {
            price: newPriceFormatted,
            timestamp
          }]);
          
          // Check all borrowers for liquidation opportunities
          console.log('🔍 Checking borrowers due to price change...');
          await refreshData();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    setPollInterval(interval);
    console.log('✅ Polling setup complete');
  };

  // CORRECTED LIQUIDATION FUNCTION - Uses Talisman wallet
  const handleLiquidate = async (opportunityId: string) => {
    const opportunity = liquidationOpportunities.find((o: LiquidationOpportunity) => o.id === opportunityId);
    if (!opportunity || !lendingVaultContract || !selectedAccount) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Starting liquidation process...');
      console.log('Opportunity:', opportunity);
      
      // Get user's Ethereum address for the transaction
      const userAddress = getEthereumAddress(selectedAccount);
      console.log('User address for liquidation:', userAddress);
      
      // Use Talisman wallet provider instead of generic window.ethereum
      let signer;
      
      // First try to get Talisman provider specifically
      if (window.talismanEth) {
        console.log('🦊 Using Talisman provider...');
        const talismanProvider = new ethers.providers.Web3Provider(window.talismanEth);
        signer = talismanProvider.getSigner(userAddress);
      } else if (window.ethereum?.isTalisman) {
        console.log('🦊 Using Talisman via window.ethereum...');
        const talismanProvider = new ethers.providers.Web3Provider(window.ethereum);
        signer = talismanProvider.getSigner(userAddress);
      } else if (window.ethereum) {
        console.log('⚠️ Using generic ethereum provider...');
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = web3Provider.getSigner(userAddress);
      } else {
        throw new Error('No wallet provider found. Please install Talisman wallet and make sure it is connected.');
      }
      
      // Connect contract to signer for transactions
      const contractWithSigner = lendingVaultContract.connect(signer);
      
      // CORRECTED: Use the amount the user needs to pay (95% of collateral value)
      // The contract expects the repay amount in USD (as integer, no decimals)
      const repayAmountUSD = Math.floor(opportunity.youPay);
      
      console.log(`💰 Liquidation Details:`);
      console.log(`  Borrower: ${opportunity.borrower}`);
      console.log(`  Collateral: ${opportunity.collateralAmount} DOT`);
      console.log(`  Collateral Value: $${opportunity.collateralValueUSD}`);
      console.log(`  You Pay: $${opportunity.youPay} (95%)`);
      console.log(`  You Receive: $${opportunity.youReceive} (100%)`);
      console.log(`  Profit: $${opportunity.profit} (5%)`);
      console.log(`  Repay Amount (to contract): ${repayAmountUSD} USD`);
      
      // Execute liquidation
      console.log(`🔄 Calling liquidate(${opportunity.borrower}, ${repayAmountUSD})...`);
      const tx = await contractWithSigner.liquidate(
        opportunity.borrower, 
        repayAmountUSD
      );
      
      console.log('📋 Liquidation transaction sent:', tx.hash);
      console.log('⏳ Waiting for transaction confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      
      // Remove the liquidated opportunity
      setLiquidationOpportunities(prev => prev.filter(o => o.id !== opportunityId));
      
      // Update stats
      setLiquidationCount(prev => prev + 1);
      setTotalProfit(prev => prev + opportunity.profit);
      
      console.log(`✅ Liquidation successful! Hash: ${tx.hash}`);
      console.log(`💰 Profit earned: $${opportunity.profit.toFixed(2)}`);
      
      // Refresh data to get updated state
      setTimeout(() => {
        refreshData();
      }, 2000); // Wait 2 seconds for blockchain to update
      
    } catch (error: any) {
      console.error('❌ Liquidation error:', error);
      
      let errorMessage = 'Liquidation failed: ';
      if (error.message.includes('Vault is healthy')) {
        errorMessage += 'Position is no longer liquidatable (health ratio improved)';
      } else if (error.message.includes('Not enough collateral')) {
        errorMessage += 'Insufficient collateral in the position';
      } else if (error.message.includes('Transfer failed') || error.message.includes('ERC20')) {
        errorMessage += 'Token transfer failed - check your USD token balance and approvals';
      } else if (error.message.includes('No wallet provider')) {
        errorMessage += 'Wallet provider not found - please install Talisman wallet';
      } else if (error.message.includes('User rejected')) {
        errorMessage += 'Transaction rejected by user in Talisman wallet';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds for transaction';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMonitoring = () => {
    if (!isMonitoring) return;
    
    console.log('🛑 Stopping liquidation monitoring...');
    
    // Clear polling interval
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    
    // Remove event listeners if any
    if (wsProvider) {
      try {
        wsProvider.destroy();
      } catch (err) {
        console.error('Error destroying WebSocket:', err);
      }
    }
    
    setIsMonitoring(false);
    console.log('✅ Monitoring stopped');
  };

  // Manual retry function for troubleshooting
  const handleManualRetry = async () => {
    console.log('🔄 Manual retry initiated...');
    setError(null);
    cleanup();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to reinitialize
    await initializeContracts();
  };

  const cleanup = () => {
    handleStopMonitoring();
    setOracleContract(null);
    setLendingVaultContract(null);
    setWsProvider(null);
    setLiquidationOpportunities([]);
    setBorrowers([]);
    setCurrentPrice(0);
    setLastPriceUpdate(null);
    setError(null);
    setIsInitializing(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl text-white">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">
              🔥 Automatic Liquidation Monitor
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Real-time Oracle price monitoring → Instant liquidation opportunities (5% guaranteed profit)
            </p>
          </div>
          
          {/* Price & Stats Display */}
          {selectedAccount && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-400 mb-1">Oracle Price</div>
                <div className="text-xl font-bold text-green-400">
                  {currentPrice > 0 ? `$${formatNumber(currentPrice)}` : '--'}
                </div>
                {lastPriceUpdate && (
                  <div className="text-xs text-neutral-500 mt-1">
                    {lastPriceUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
              
              <div className="bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-400 mb-1">Total Profit</div>
                <div className="text-xl font-bold text-green-400">
                  ${formatNumber(totalProfit)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {liquidationCount} liquidations
                </div>
              </div>
              
              <div className="bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-400 mb-1">Price Events</div>
                <div className="text-xl font-bold text-blue-400">
                  {eventCount}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Polling (5s)
                </div>
              </div>
              
              <div className="bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-400 mb-1">Opportunities</div>
                <div className={`text-xl font-bold ${liquidationOpportunities.length > 0 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                  {liquidationOpportunities.length}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {borrowers.length} monitored
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {selectedAccount && (
          <div className="flex items-center space-x-4 mb-6">
            {/* Contract Status Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isInitializing 
                ? 'bg-yellow-100 text-yellow-800'
                : lendingVaultContract && oracleContract
                  ? isMonitoring 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isInitializing
                  ? 'bg-yellow-500 animate-pulse'
                  : lendingVaultContract && oracleContract
                    ? isMonitoring 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-blue-500'
                    : 'bg-red-500'
              }`}></div>
              <span>
                {isInitializing 
                  ? 'Initializing Contracts...' 
                  : lendingVaultContract && oracleContract
                    ? isMonitoring 
                      ? 'Auto-Monitoring Active' 
                      : 'Contracts Ready'
                    : 'Contracts Not Available'
                }
              </span>
            </div>
            
            {/* Retry Contracts Button (if failed) */}
            {!isInitializing && !lendingVaultContract && (
              <button
                onClick={initializeContracts}
                disabled={isInitializing}
                className="flex items-center space-x-2 px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm text-white"
              >
                <RefreshCw size={14} className={isInitializing ? 'animate-spin' : ''} />
                <span>Retry Contracts</span>
              </button>
            )}

            {/* Manual Full Retry Button */}
            {!isInitializing && selectedAccount && (
              <button
                onClick={handleManualRetry}
                disabled={isInitializing || isLoading}
                className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white"
              >
                <RefreshCw size={14} className={isInitializing ? 'animate-spin' : ''} />
                <span>Full Reset</span>
              </button>
            )}
            
            {/* Start/Stop Monitoring */}
            {lendingVaultContract && oracleContract && (
              <button
                onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                disabled={isLoading || isInitializing}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  isMonitoring 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isMonitoring ? <Square size={14} /> : <Play size={14} />}
                <span>{isMonitoring ? 'Stop' : 'Start'}</span>
              </button>
            )}
            
            {/* Refresh Data */}
            <button
              onClick={refreshData}
              disabled={isLoading || !lendingVaultContract || !selectedAccount || isInitializing}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-sm text-white"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Checking...' : 'Refresh'}</span>
            </button>
            
            {/* Connection Type Indicator */}
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Polling (5s)
            </div>
          </div>
        )}

        {/* Debug Information Panel for Connection Issues */}
        {selectedAccount && !lendingVaultContract && !isInitializing && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-sm font-semibold mb-3 flex items-center text-yellow-700 dark:text-yellow-300">
              <AlertCircle size={16} className="mr-2" />
              🔍 Connection Diagnostics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg">
                <div className="font-medium text-blue-600">Wallet Status</div>
                <div className="text-neutral-500">
                  Status: <span className={status === 'connected' ? 'text-green-600' : 'text-yellow-600'}>{status}</span><br/>
                  Account: <span className={selectedAccount ? 'text-green-600' : 'text-red-600'}>{selectedAccount ? shortenAddress(typeof selectedAccount === 'string' ? selectedAccount : selectedAccount.address || '') : 'None'}</span>                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg">
                <div className="font-medium text-green-600">Contracts</div>
                <div className="text-neutral-500">
                  Oracle: <span className={oracleContract ? 'text-green-600' : 'text-red-600'}>{oracleContract ? 'Connected' : 'Not Connected'}</span><br/>
                  Vault: <span className={lendingVaultContract ? 'text-green-600' : 'text-red-600'}>{lendingVaultContract ? 'Connected' : 'Not Connected'}</span><br/>
                  Initializing: <span className={isInitializing ? 'text-yellow-600' : 'text-green-600'}>{isInitializing ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg">
                <div className="font-medium text-red-600">Network Config</div>
                <div className="text-neutral-500 text-xs">
                  RPC: {CONTRACT_CONFIG.RPC_URL.slice(0, 30)}...<br/>
                  Oracle: {CONTRACT_CONFIG.ORACLE_ADDRESS.slice(0, 10)}...<br/>
                  Vault: {CONTRACT_CONFIG.LENDING_VAULT_ADDRESS.slice(0, 10)}...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Oracle Monitoring Status */}
        {selectedAccount && isMonitoring && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <Bell size={16} className="mr-2 text-blue-500" />
              🔥 Oracle Price Monitoring Active - Auto-Liquidation Detection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg">
                <div className="font-medium text-blue-600">Health Ratio Threshold</div>
                <div className="text-neutral-500">Below 100 * 10^18 = Liquidatable</div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg">
                <div className="font-medium text-green-600">Auto Health Check</div>
                <div className="text-neutral-500">Refresh → getAllBorrowers → checkHealth</div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg">
                <div className="font-medium text-red-600">5% Profit Guaranteed</div>
                <div className="text-neutral-500">Pay 95% → Get 100% of collateral value</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
          >
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('connect your wallet') && (
                  <div className="text-sm mt-2 text-red-600">
                    <strong>Troubleshooting:</strong><br/>
                    • Make sure Talisman wallet extension is installed<br/>
                    • Click wallet connect button in app header<br/>
                    • Approve connection in Talisman wallet popup<br/>
                    • Current wallet status: <span className="font-bold">{status}</span>
                  </div>
                )}
                {error.includes('Failed to initialize contracts') && (
                  <div className="text-sm mt-2 text-red-600">
                    <strong>Contract Connection Issues:</strong><br/>
                    • Check your internet connection<br/>
                    • Verify Westend Asset Hub RPC is accessible<br/>
                    • Try clicking "Retry Contracts" button<br/>
                    • Switch to Westend Asset Hub network in wallet
                  </div>
                )}
                {error.includes('provider not available') && (
                  <div className="text-sm mt-2 text-red-600">
                    <strong>Wallet Provider Issues:</strong><br/>
                    • Refresh the page and reconnect Talisman wallet<br/>
                    • Make sure Talisman wallet extension is enabled<br/>
                    • Try switching wallet accounts and back<br/>
                    • Current status: {status}, Account: {selectedAccount ? 'Connected' : 'Not Connected'}
                  </div>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </div>
      
      {!selectedAccount ? (
        <Card className="p-8 text-center">
          <Info size={24} className="text-neutral-500 dark:text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Wallet to Access Auto-Liquidations</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
            Connect your wallet to automatically monitor oracle price updates and capture liquidation opportunities with guaranteed 5% profit.
          </p>
          <div className="text-sm text-neutral-500 mb-4">
            Current Status: <span className="font-bold">{status}</span>
          </div>
          {/* Add wallet connection guidance */}
          <div className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
            <strong>Steps to connect:</strong><br/>
            1. Install Talisman wallet extension<br/>
            2. Click the wallet connect button in the app header<br/>
            3. Approve the connection request in Talisman<br/>
            4. Switch to Westend Asset Hub network if needed
          </div>
        </Card>
      ) : (
        <>
          {/* How It Works Section */}
          <div className="mb-8 p-6 bg-gradient-to-br from-neutral-50 to-blue-50 dark:from-neutral-800 dark:to-blue-900/20 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign size={20} className="mr-2 text-green-500" />
              🚀 Automatic Liquidation System (Westend Asset Hub)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">1. Get All Borrowers</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Calls getAllBorrowers() to get array of borrower addresses
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">2. Check Health Ratios</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  For each address, calls getBorrowerDetails() to get health ratio
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">3. Find Liquidatable</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Health ratio &lt; 100 * 10^18 = Instantly shows as liquidatable
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-primary-500 font-medium">4. 5% Profit</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Pay 95% of collateral value → Get 100% of collateral = 5% profit
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold">🚨 Live Liquidation Opportunities</h2>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {liquidationOpportunities.length} liquidatable • {borrowers.length} monitored
            </div>
          </div>
          
          {isLoading && liquidationOpportunities.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-neutral-600 dark:text-neutral-400">
                {isMonitoring ? 'Checking all borrower health ratios...' : 'Initializing monitoring system...'}
              </p>
            </Card>
          ) : (
            <AnimatePresence>
              {liquidationOpportunities.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {liquidationOpportunities.map((opportunity) => (
                    <motion.div 
                      key={opportunity.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-6 bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-purple-900/30 dark:to-pink-900/20 rounded-xl border border-purple-200/60 dark:border-purple-700/40 backdrop-blur-sm">
                        <div className="p-5 border-b border-red-200 dark:border-red-700 flex justify-between items-center">
                          <div>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">Liquidatable Borrower</span>
                            <div className="flex items-center mt-1">
                              <span className="font-medium">{shortenAddress(opportunity.borrower)}</span>
                              <a 
                                href={`https://westend-asset-hub.subscan.io/account/${opportunity.borrower}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary-500 ml-1 hover:text-primary-600"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex flex-col items-end">
                              <span className="text-sm text-neutral-500 dark:text-neutral-400">Health Ratio</span>
                              <span className="text-red-600 dark:text-red-400 font-bold mt-1 flex items-center">
                                <TrendingDown size={14} className="mr-1" />
                                {opportunity.healthRatioFormatted.toFixed(4)}
                              </span>
                              <span className="text-xs text-neutral-500">
                                ({opportunity.healthRatio.toString()})
                              </span>
                            </div>
                            
                            <div className="text-xs bg-red-200 text-red-800 px-3 py-1 rounded-full font-bold animate-pulse">
                              🔥 LIQUIDATABLE
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-5">
                          {/* CORRECTED Display Values */}
                          <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                              <h3 className="text-sm font-medium mb-3 text-neutral-500 dark:text-neutral-400">You Pay (95%)</h3>
                              <div className="flex items-center mb-2">
                                <img src={opportunity.debtAsset.icon} alt={opportunity.debtAsset.symbol} className="w-6 h-6 mr-2" />
                                <span className="font-bold text-lg">${formatNumber(opportunity.youPay)}</span>
                              </div>
                              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                95% of {formatNumber(opportunity.collateralAmount)} DOT value
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium mb-3 text-neutral-500 dark:text-neutral-400">You Receive (100%)</h3>
                              <div className="flex items-center mb-2">
                                <img src={opportunity.collateralAsset.icon} alt={opportunity.collateralAsset.symbol} className="w-6 h-6 mr-2" />
                                <span className="font-bold text-lg text-green-600">${formatNumber(opportunity.youReceive)}</span>
                              </div>
                              <div className="text-sm text-success-600 dark:text-success-400">
                                {formatNumber(opportunity.collateralAmount)} DOT tokens
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg mb-4 border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-green-700 dark:text-green-300 flex items-center">
                                  <DollarSign size={16} className="mr-1" />
                                  🔥 Guaranteed 5% Profit
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Pay ${formatNumber(opportunity.youPay)} → Get ${formatNumber(opportunity.youReceive)}
                                </p>
                              </div>
                              <div className="text-2xl font-black text-green-600 dark:text-green-400">
                                +${formatNumber(opportunity.profit)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-neutral-500 mb-4 flex justify-between items-center bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
                            <span>Detected: {opportunity.lastUpdated.toLocaleTimeString()}</span>
                            <span>Oracle: ${formatNumber(currentPrice)}</span>
                            <span>Collateral: {formatNumber(opportunity.collateralAmount)} DOT</span>
                          </div>
                          
                          <button
                            onClick={() => handleLiquidate(opportunity.id)}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-700 dark:disabled:to-neutral-800 text-white font-bold rounded-lg px-4 py-3 transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Processing Liquidation...</span>
                              </>
                            ) : (
                              <>
                                <DollarSign size={16} />
                                <span>🚀 Liquidate for ${formatNumber(opportunity.profit)} Profit</span>
                                <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info size={24} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">✅ All Positions Healthy</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                    No liquidation opportunities found. All {borrowers.length} monitored positions have health ratios above 100 * 10^18.
                  </p>
                  <div className="text-sm text-neutral-500">
                    {isMonitoring ? (
                      <span className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                        🔥 Auto-monitoring active - Click "Refresh" to check all borrowers again
                      </span>
                    ) : (
                      'Click "Start" to begin automatic monitoring, or "Refresh" to check all borrowers manually'
                    )}
                  </div>
                </Card>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
};

export default Liquidations;