import React, { useEffect, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { formatNumber, addCommasToNumber } from '../utils/helpers';
import { AlertCircle, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContainerProps,
  AssetWithBalance,
  getAccountAddress
} from '../types/lending';

// RPC and contract addresses
const WESTEND_RPC_URL = 'https://westend-asset-hub-eth-rpc.polkadot.io';
const ERC20_TOKEN_CONTRACT = '0xd874C3d577864A8474AA0D01C92a2e638D054b7d';
const LENDING_VAULT_CONTRACT = '0x7Ff93137156667a7331D4E8C0dEebC0909901bb1';

// Westend Asset Hub network configuration
const WESTEND_ASSET_HUB_CONFIG = {
  chainId: '0x690', // 1680 in decimal
  chainName: 'Westend Asset Hub',
  rpcUrls: ['https://westend-asset-hub-eth-rpc.polkadot.io'],
  nativeCurrency: {
    name: 'WND',
    symbol: 'WND',
    decimals: 12
  },
  blockExplorerUrls: ['https://westend-asset-hub.subscan.io/']
};

// Basic ERC20 ABI
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
  }
];

interface ApproveContainerProps extends ContainerProps {
  availableAssets: any[];
  isAssetMenuOpen: boolean;
  setIsAssetMenuOpen: (open: boolean) => void;
}

const ApproveContainer: React.FC<ApproveContainerProps> = ({
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
  availableAssets,
  isAssetMenuOpen,
  setIsAssetMenuOpen,
  onTransactionComplete
}) => {
  const { selectedAccount, walletType } = useWallet();
  
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Helper function to ensure Ethereum-compatible address
  const getEthereumAddress = (account: any): string => {
    try {
      const address = getAccountAddress(account);
      
      if (address.startsWith('0x') && address.length === 42) {
        return address;
      }
      
      if (account.address && account.address.startsWith('0x') && account.address.length === 42) {
        return account.address;
      }
      
      throw new Error(`No Ethereum-compatible address found. Address: ${address}`);
    } catch (error) {
      console.error('Address conversion error:', error);
      throw new Error(`Invalid address format: ${error}`);
    }
  };

  // Helper function to get current approval amount for an asset
  const getCurrentApproval = (asset: AssetWithBalance): number => {
    if (!selectedAccount) return 0;
    try {
      const accountKey = getEthereumAddress(selectedAccount);
      const accountApprovals = approvals[accountKey];
      if (!accountApprovals) return 0;
      const tokenApproval = accountApprovals[asset.id];
      return tokenApproval ? tokenApproval.amount : 0;
    } catch (error) {
      console.error('Error getting current approval:', error);
      return 0;
    }
  };

  // Helper function to update approval state
  const updateApproval = (asset: AssetWithBalance, amount: number, transactionHash?: string) => {
    if (!selectedAccount) return;
    
    try {
      const accountKey = getEthereumAddress(selectedAccount);
      
      setApprovals(prev => ({
        ...prev,
        [accountKey]: {
          ...prev[accountKey],
          [asset.id]: {
            asset,
            amount,
            timestamp: new Date(),
            transactionHash
          }
        }
      }));
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };

  // Function to get user's token balance
  const getTokenBalance = async (): Promise<number> => {
    try {
      if (!selectedAccount) {
        throw new Error('No wallet connected');
      }
  
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(WESTEND_RPC_URL);
      const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, provider);
      
      const accountAddress = getEthereumAddress(selectedAccount);
      const balance = await tokenContract.balanceOf(accountAddress);
      const decimals = await tokenContract.decimals();
      
      const formattedBalance = parseFloat(ethers.utils.formatUnits(balance, decimals));
      
      console.log(`Token balance: ${formattedBalance}`);
      return formattedBalance;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      throw error;
    }
  };

  // Function to check and switch network
  const ensureCorrectNetwork = async (provider: any): Promise<void> => {
    try {
      const currentChainId = await provider.send('eth_chainId', []);
      
      if (currentChainId !== WESTEND_ASSET_HUB_CONFIG.chainId) {
        console.log('🔄 Wrong network detected, attempting to switch...');
        
        try {
          await provider.send('wallet_switchEthereumChain', [
            { chainId: WESTEND_ASSET_HUB_CONFIG.chainId }
          ]);
          console.log('✅ Successfully switched to Westend Asset Hub');
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            console.log('⚡ Adding Westend Asset Hub...');
            await provider.send('wallet_addEthereumChain', [WESTEND_ASSET_HUB_CONFIG]);
            console.log('✅ Successfully added and switched to Westend Asset Hub');
          } else {
            throw switchError;
          }
        }
      } else {
        console.log('✅ Already on correct network (Westend Asset Hub)');
      }
    } catch (error) {
      console.error('❌ Network switching failed:', error);
      throw new Error(`Please manually switch to Westend Asset Hub network in Talisman. Error: ${error}`);
    }
  };

  // Function to get Polkadot wallet signer
  const getPolkadotSigner = async () => {
    if (walletType !== 'polkadot') {
      throw new Error('Please connect a Polkadot wallet');
    }

    const ethers = await import('ethers');
    
    if (typeof window !== 'undefined') {
      let provider;
      
      // Try Talisman's Ethereum provider
      if ((window as any).talismanEth) {
        console.log('✅ Using Talisman ethereum provider');
        provider = new ethers.providers.Web3Provider((window as any).talismanEth);
        
        try {
          await provider.send("eth_requestAccounts", []);
          await ensureCorrectNetwork(provider);
          console.log('✅ Ethereum account access granted');
        } catch (requestError) {
          console.log('⚠️ Ethereum setup failed:', requestError);
        }
      }
      // Fallback strategies
      else if ((window as any).talisman?.ethereum) {
        provider = new ethers.providers.Web3Provider((window as any).talisman.ethereum);
        await provider.send("eth_requestAccounts", []);
        await ensureCorrectNetwork(provider);
      }
      else if ((window as any).ethereum?.providers) {
        const talismandProvider = (window as any).ethereum.providers.find((p: any) => 
          p.isTalisman || p._isTalisman
        );
        if (talismandProvider) {
          provider = new ethers.providers.Web3Provider(talismandProvider);
          await provider.send("eth_requestAccounts", []);
          await ensureCorrectNetwork(provider);
        }
      }
      
      if (provider) {
        const signer = await provider.getSigner();
        console.log('✅ Successfully created signer');
        return signer;
      }
      
      throw new Error('No compatible Ethereum provider found. Please ensure Talisman wallet is connected.');
    }
    
    throw new Error('Please use Talisman wallet for Ethereum transactions.');
  };

  // Function to interact with blockchain for token approval
  const approveTokenOnChain = async (amount: number): Promise<string> => {
    try {
      if (!selectedAccount) {
        throw new Error('No wallet connected');
      }

      const ethers = await import('ethers');
      const signer = await getPolkadotSigner();
      const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, signer);
      
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);
      
      console.log(`Approving ${amount} tokens for lending vault...`);
      
      const tx = await tokenContract.approve(LENDING_VAULT_CONTRACT, amountInWei);
      console.log(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${receipt.transactionHash}`);
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Blockchain approval error:', error);
      throw error;
    }
  };

  // Function to check current allowance from blockchain
  const checkAllowanceOnChain = async (): Promise<number> => {
    try {
      if (!selectedAccount) return 0;

      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(WESTEND_RPC_URL);
      const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, provider);
      
      const accountAddress = getEthereumAddress(selectedAccount);
      const allowance = await tokenContract.allowance(accountAddress, LENDING_VAULT_CONTRACT);
      const decimals = await tokenContract.decimals();
      
      return parseFloat(ethers.utils.formatUnits(allowance, decimals));
    } catch (error) {
      console.error('Error checking allowance:', error);
      return 0;
    }
  };

  // Effect to fetch balance and check allowance when asset or account changes
  useEffect(() => {
    const fetchData = async () => {
      if (selectedAsset && selectedAccount) {
        setIsLoadingBalance(true);
        try {
          const [balance, allowance] = await Promise.all([
            getTokenBalance(),
            checkAllowanceOnChain()
          ]);
          
          setTokenBalance(balance);
          
          const currentApproval = getCurrentApproval(selectedAsset);
          if (Math.abs(allowance - currentApproval) > 0.001) {
            updateApproval(selectedAsset, allowance);
          }
        } catch (error) {
          console.error('Failed to fetch token data:', error);
          setError('Failed to fetch token balance from Westend Asset Hub. Please try again.');
        } finally {
          setIsLoadingBalance(false);
        }
      }
    };

    fetchData();
  }, [selectedAsset?.id, selectedAccount]);

  // Handle amount change with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setBorrowAmount(value);
      setError(null);
      
      if (value && !isNaN(parseFloat(value))) {
        const amount = parseFloat(value);
        if (amount > tokenBalance) {
          setError(`Amount exceeds your token balance (${formatNumber(tokenBalance)})`);
        }
      }
    }
  };

  // Set max amount based on actual token balance
  const setMaxAmount = async () => {
    try {
      setIsLoadingBalance(true);
      const balance = await getTokenBalance();
      setTokenBalance(balance);
      setBorrowAmount(balance.toString());
      setError(null);
    } catch (error) {
      console.error('Error fetching balance for max amount:', error);
      setError('Failed to fetch token balance from Westend Asset Hub');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Handle approve
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset) {
      setError('Please select an asset');
      return;
    }
    
    if (walletType !== 'polkadot') {
      setError('Please connect a Polkadot wallet to interact with Westend Asset Hub');
      return;
    }
    
    const amount = parseFloat(borrowAmount);
    
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > tokenBalance) {
      setError(`Amount exceeds your token balance (${formatNumber(tokenBalance)})`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log(`Attempting to approve ${amount} tokens...`);
      
      const txHash = await approveTokenOnChain(amount);
      updateApproval(selectedAsset, amount, txHash);
      
      console.log(`✅ Successfully approved ${amount} tokens`);
      console.log(`Transaction hash: ${txHash}`);
      
      setBorrowAmount('');
      onTransactionComplete?.();
      
    } catch (blockchainError: any) {
      console.error('❌ Transaction error:', blockchainError);
      
      // Handle specific error types
      if (blockchainError?.code === 4001) {
        setError('Transaction was rejected by user');
      } else if (blockchainError?.message?.includes('insufficient funds')) {
        setError('Insufficient funds for gas fee');
      } else if (blockchainError?.message?.includes('user rejected')) {
        setError('Transaction was rejected by user');
      } else {
        setError(`Transaction failed: ${blockchainError?.message || 'Unknown error occurred'}`);
      }
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
            <strong>Approve Token:</strong> Grant permission for the lending contract to transfer 
            your tokens on Westend Asset Hub.
          </div>
        </div>
      </div>
      
      <form onSubmit={handleApprove}>
        {/* Asset selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Asset
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
                  {availableAssets.map((item) => {
                    const asset = 'asset' in item ? item.asset : item;
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
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          Current: {formatNumber(getCurrentApproval(asset))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {availableAssets.length === 0 && (
                    <div className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                      No assets available for approval
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
              Approval Amount
            </label>
            
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center space-x-2">
              <span>Max: {isLoadingBalance ? '...' : formatNumber(tokenBalance)}</span>
              <button
                type="button"
                onClick={setMaxAmount}
                disabled={isLoadingBalance}
                className="text-primary-500 hover:text-primary-600 font-medium disabled:opacity-50"
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
        </div>
        
        {/* Transaction details */}
        {selectedAsset && borrowAmount && !isNaN(parseFloat(borrowAmount)) && parseFloat(borrowAmount) >= 0 && (
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">Transaction Preview</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Network</span>
                <span className="font-medium">Westend Asset Hub</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Your Balance</span>
                <span className="font-medium">
                  {formatNumber(tokenBalance)} tokens
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Amount to Approve</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  {formatNumber(parseFloat(borrowAmount))} tokens
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Spender Contract</span>
                <span className="font-medium text-xs font-mono">
                  {LENDING_VAULT_CONTRACT}
                </span>
              </div>
              
              {parseFloat(borrowAmount) > tokenBalance && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-800 dark:text-red-200">
                    ❌ Amount exceeds your balance! Max available: {formatNumber(tokenBalance)} tokens
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
            isLoadingBalance ||
            !selectedAsset || 
            !borrowAmount || 
            isNaN(parseFloat(borrowAmount)) ||
            parseFloat(borrowAmount) < 0 ||
            parseFloat(borrowAmount) > tokenBalance ||
            walletType !== 'polkadot'
          }
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg px-4 py-3 transition-all duration-200"
        >
          {isSubmitting
            ? 'Processing...'
            : isLoadingBalance
              ? 'Loading Balance...'
              : walletType !== 'polkadot'
                ? 'Connect Polkadot Wallet'
                : selectedAsset && getCurrentApproval(selectedAsset) > 0 
                  ? 'Update Approval'
                  : 'Approve Token'
          }
        </button>
      </form>
    </div>
  );
};

export default ApproveContainer;