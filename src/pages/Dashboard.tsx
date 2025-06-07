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

// CollateralToken ABI
const networth = 0
const COLLATERAL_TOKEN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const oracleAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_price",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "getPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_newPrice",
        "type": "uint256"
      }
    ],
    "name": "setPrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const CONTRACT_ADDRESS = '0x722F539B007021Db6f1313E3Ce500c2bEd12fD37';
const MOCK_ORACLE_ADDRESS = '0x3753e84bb63B833635Ba081D203BFc7f91E029e0';
const RPC_URL = 'https://westend-asset-hub-eth-rpc.polkadot.io';

interface TokenBalance {
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
}

interface OraclePrice {
  price: string;
  formattedPrice: string;
  decimals: number;
}

const Dashboard: React.FC = () => {
  const { userPositions, healthRatio, markets } = useLending();
  const { status, selectedAccount } = useWallet();
  
  // State for contract data
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  
  // State for oracle price
  const [oraclePrice, setOraclePrice] = useState<OraclePrice | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // Calculate totals from existing positions
  const totalSupplied = userPositions.reduce((sum, position) => {
    return sum + (position.supplied * position.asset.price);
  }, 0);
  
  const totalBorrowed = userPositions.reduce((sum, position) => {
    return sum + (position.borrowed * position.asset.price);
  }, 0);
  
  // Calculate net worth first (needed for borrowing power calculation)
  const getNetWorthValue = () => {
    let contractTokenValue = 0;
    
    if (tokenBalance && oraclePrice) {
      // Use oracle price for token valuation
      const tokenPrice = parseFloat(oraclePrice.formattedPrice);
      contractTokenValue = parseFloat(tokenBalance.balance) * tokenPrice;
    }
    
    return totalSupplied - totalBorrowed + contractTokenValue;
  };

  const availableToBorrow = (getNetWorthValue() - totalBorrowed) * 0.75;

  // Function to fetch oracle price
  const fetchOraclePrice = async () => {
    setIsLoadingPrice(true);
    setPriceError(null);
    
    try {
      // Encode the getPrice function call
      const getPriceSelector = '0x98d5fdca'; // getPrice() function selector
      
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: MOCK_ORACLE_ADDRESS,
              data: getPriceSelector
            },
            'latest'
          ],
          id: 1
        })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      // Parse the price result
      const priceHex = data.result;
      const priceBigInt = BigInt(priceHex);
      
      // Assuming the oracle returns price with 8 decimal places
      const decimals = 8;
      const divisor = BigInt(10) ** BigInt(decimals);
      const formattedPrice = (Number(priceBigInt) / Number(divisor));
      
      setOraclePrice({
        price: priceBigInt.toString(),
        formattedPrice: formattedPrice.toFixed(8),
        decimals: decimals
      });
      
    } catch (error) {
      console.error('Error fetching oracle price:', error);
      setPriceError('Failed to fetch oracle price');
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Function to fetch token balance from contract using fetch API
  const fetchTokenBalance = async (userAddress: string) => {
    if (!userAddress) return;
    
    setIsLoadingBalance(true);
    setBalanceError(null);
    
    try {
      // Helper function to make RPC calls
      const makeRpcCall = async (method: string, params: any[] = []) => {
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: CONTRACT_ADDRESS,
                data: method
              },
              'latest'
            ],
            id: 1
          })
        });
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message);
        }
        return data.result;
      };
      
      // Encode function calls
      const balanceOfSelector = '0x70a08231'; // balanceOf(address)
      const decimalsSelector = '0x313ce567'; // decimals()
      const nameSelector = '0x06fdde03'; // name()
      const symbolSelector = '0x95d89b41'; // symbol()
      
      // Pad address to 32 bytes for balanceOf call
      const paddedAddress = userAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      
      // Make contract calls
      const [balanceResult, decimalsResult, nameResult, symbolResult] = await Promise.all([
        makeRpcCall(balanceOfSelector + paddedAddress),
        makeRpcCall(decimalsSelector),
        makeRpcCall(nameSelector),
        makeRpcCall(symbolSelector)
      ]);
      
      // Parse results
      const balance = BigInt(balanceResult);
      const decimals = parseInt(decimalsResult, 16);
      
      // Decode name and symbol (they are encoded as bytes32)
      const decodeName = (hex: string) => {
        const bytes = hex.replace('0x', '');
        let result = '';
        for (let i = 0; i < bytes.length; i += 2) {
          const byte = parseInt(bytes.substr(i, 2), 16);
          if (byte !== 0) {
            result += String.fromCharCode(byte);
          }
        }
        return result;
      };
      
      const name = decodeName(nameResult);
      const symbol = decodeName(symbolResult);
      
      // Format balance
      const divisor = BigInt(10) ** BigInt(decimals);
      const formattedBalance = (Number(balance) / Number(divisor)).toString();
      
      setTokenBalance({
        balance: formattedBalance,
        decimals: decimals,
        name: name || 'Unknown Token',
        symbol: symbol || 'UNK'
      });
      
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setBalanceError('Failed to fetch token balance');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Effect to fetch balance and price when wallet is connected
  useEffect(() => {
    if (selectedAccount?.address) {
      fetchTokenBalance(selectedAccount.address);
    }
    // Fetch oracle price regardless of wallet connection
    fetchOraclePrice();
  }, [selectedAccount?.address]);

  // Calculate net worth including contract token balance
  const getNetWorth = () => {
    return getNetWorthValue();
  };

  // Check if the user has positions
  const hasPositions = userPositions.length > 0 || (tokenBalance && parseFloat(tokenBalance.balance) > 0);

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
        
        {/* Oracle Price Display (visible even when not connected) */}
        <div className="flex justify-center mb-8">
          <Card className="p-4 max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Oracle Price</h3>
              <button
                onClick={fetchOraclePrice}
                disabled={isLoadingPrice}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title="Refresh price"
              >
                <RefreshCw size={14} className={`${isLoadingPrice ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {isLoadingPrice ? (
              <div className="flex items-center space-x-2">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">Loading price...</span>
              </div>
            ) : priceError ? (
              <p className="text-sm text-red-500">{priceError}</p>
            ) : oraclePrice ? (
              <div>
                <p className="text-lg font-bold">${oraclePrice.formattedPrice}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Raw: {oraclePrice.price} (8 decimals)
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No price data</p>
            )}
          </Card>
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
          <h1 className="text-2xl md:text-3xl font-heading font-bold ">Your Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your positions and monitor your health ratio
          </p>
        </div>
        
        {hasPositions && (
          <div className="mt-4 md:mt-0">
            <HealthRatioGauge healthRatio={healthRatio} />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10 text-white">
        {/* Enhanced Net Worth Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Net Worth</h2>
            <button
              onClick={() => selectedAccount?.address && fetchTokenBalance(selectedAccount.address)}
              disabled={isLoadingBalance}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Refresh balance"
            >
              <RefreshCw size={16} className={`${isLoadingBalance ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="text-3xl font-bold mb-2">{formatCurrency(getNetWorth())}</div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Supplied</p>
              <p className="text-lg font-semibold">{formatCurrency(totalSupplied)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Borrowed</p>
              <p className="text-lg font-semibold">{formatCurrency(totalBorrowed)}</p>
            </div>
          </div>
          
          {/* Contract Token Balance Section */}
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Contract Token</p>
            {isLoadingBalance ? (
              <div className="flex items-center space-x-2">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : balanceError ? (
              <p className="text-sm text-red-500">{balanceError}</p>
            ) : tokenBalance ? (
              <div>
                <p className="text-lg font-semibold">
                  {parseFloat(tokenBalance.balance).toFixed(4)} {tokenBalance.symbol}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {tokenBalance.name}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No balance</p>
            )}
          </div>
        </Card>
        
        {/* Oracle Price Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Oracle Price</h2>
            <button
              onClick={fetchOraclePrice}
              disabled={isLoadingPrice}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Refresh price"
            >
              <RefreshCw size={16} className={`${isLoadingPrice ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {isLoadingPrice ? (
            <div className="flex items-center space-x-2">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Loading price...</span>
            </div>
          ) : priceError ? (
            <div>
              <p className="text-sm text-red-500 mb-2">{priceError}</p>
              <button
                onClick={fetchOraclePrice}
                className="text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          ) : oraclePrice ? (
            <div>
              <div className="text-3xl font-bold mb-2">${oraclePrice.formattedPrice}</div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Raw Value</p>
                  <p className="text-sm font-mono">{oraclePrice.price}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Decimals</p>
                  <p className="text-sm">{oraclePrice.decimals}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No price data</p>
          )}
        </Card>
        
        {/* Borrowing Power Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Borrowing Power</h2>
          <div className="text-3xl font-bold mb-2">{formatCurrency(availableToBorrow)}</div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Available to borrow based on your collateral
          </p>
          
          <div className="mt-6">
            <Link 
              to="/borrow"
              className="w-full flex items-center justify-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg px-4 py-2 transition-all duration-200"
            >
              <span>Borrow</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
        
        {/* Health Status Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Health Status</h2>
          
          {!hasPositions ? (
            <div className="flex flex-col items-center justify-center h-32">
              <p className="text-neutral-500 dark:text-neutral-400 text-center">
                You have no active positions yet.
              </p>
              <Link 
                to="/markets"
                className="mt-4 inline-flex items-center text-primary-500 hover:text-primary-600"
              >
                <span>Explore markets</span>
                <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Liquidation at
                </p>
                <p className="text-lg font-medium">&lt; 1.0 Health Ratio</p>
              </div>
              
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Current health ratio
                </p>
                <p className={`text-lg font-medium ${
                  healthRatio.status === 'healthy' ? 'text-success-600' : 
                  healthRatio.status === 'warning' ? 'text-warning-600' : 
                  'text-error-600'
                }`}>
                  {healthRatio.value.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      {/* Your Supplies */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Your Supplies</h2>
          <Link 
            to="/markets" 
            className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
          >
            Supply More
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        <Card>
          {userPositions.filter(p => p.supplied > 0).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                You haven't supplied any assets yet.
              </p>
              <Link 
                to="/markets"
                className="inline-flex items-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg px-4 py-2 transition-all duration-200"
              >
                <PlusCircle size={16} />
                <span>Supply Assets</span>
              </Link>
            </div>
          ) : (
            <div>
              {userPositions.filter(p => p.supplied > 0).map((position) => {
                const market = markets.find(m => m.asset.id === position.asset.id);
                return (
                  <AssetRow
                    key={position.asset.id}
                    asset={position.asset}
                    balance={position.supplied}
                    value={position.supplied * position.asset.price}
                    apy={market?.supplyAPY}
                    actions={
                      <div className="flex space-x-2">
                        <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700" title="Withdraw">
                          <MinusCircle size={20} />
                        </button>
                        <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700" title="Supply">
                          <PlusCircle size={20} />
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
      
      {/* Your Borrows */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Your Borrows</h2>
          <Link 
            to="/borrow" 
            className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
          >
            Borrow More
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        <Card>
          {userPositions.filter(p => p.borrowed > 0).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                You haven't borrowed any assets yet.
              </p>
              <Link 
                to="/borrow"
                className="inline-flex items-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg px-4 py-2 transition-all duration-200"
              >
                <span>Borrow Assets</span>
              </Link>
            </div>
          ) : (
            <div>
              {userPositions.filter(p => p.borrowed > 0).map((position) => {
                const market = markets.find(m => m.asset.id === position.asset.id);
                return (
                  <AssetRow
                    key={position.asset.id}
                    asset={position.asset}
                    balance={position.borrowed}
                    value={position.borrowed * position.asset.price}
                    apy={market?.borrowAPY}
                    actions={
                      <div className="flex space-x-2">
                        <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700" title="Repay">
                          <MinusCircle size={20} />
                        </button>
                        <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700" title="Borrow More">
                          <PlusCircle size={20} />
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;