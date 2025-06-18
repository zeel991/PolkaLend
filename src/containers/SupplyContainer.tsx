import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useLending } from '../contexts/LendingContext';
import { formatCurrency, formatNumber, addCommasToNumber } from '../utils/helpers';
import { AlertCircle, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContainerProps, AssetWithBalance, getAccountAddress } from '../types/lending';

// Contract addresses (same as ApproveContainer)
const WESTEND_RPC_URL = 'https://westend-asset-hub-eth-rpc.polkadot.io';
const ERC20_TOKEN_CONTRACT = '0xb0695a64E1ed17D9F392Fc53fAb22c122B742A68';
const LENDING_VAULT_CONTRACT = '0x3b6708f2e32441DE7C1CDCeA68719DA3bEdcb9CD';

// ERC20 ABI
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

// Lending Vault ABI
const LENDING_VAULT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "depositCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

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

interface SupplyContainerProps extends ContainerProps {
  availableAssets: any[];
  isAssetMenuOpen: boolean;
  setIsAssetMenuOpen: (open: boolean) => void;
  maxCollateralAmount: number;
  healthRatio: any;
  simulatedHealthRatio: any;
}

const SupplyContainer: React.FC<SupplyContainerProps> = ({
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
  healthRatio,
  simulatedHealthRatio,
  onTransactionComplete
}) => {
  const { selectedAccount, walletType } = useWallet();
  const { markets } = useLending();
  const [collateralInfo, setCollateralInfo] = React.useState({ allowance: 0, balance: 0 });

  // Get selected market info
  const selectedMarket = selectedAsset ? markets.find(m => m.asset.id === selectedAsset.id) : null;

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

  // Function to get collateral info (allowance and balance)
  const fetchCollateralInfo = async () => {
    try {
      if (!selectedAccount) {
        setCollateralInfo({ allowance: 0, balance: 0 });
        return;
      }

      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(WESTEND_RPC_URL);
      const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, provider);

      const userAddress = getEthereumAddress(selectedAccount);

      const [allowance, balance, decimals] = await Promise.all([
        tokenContract.allowance(userAddress, LENDING_VAULT_CONTRACT),
        tokenContract.balanceOf(userAddress),
        tokenContract.decimals()
      ]);

      setCollateralInfo({
        allowance: parseFloat(ethers.utils.formatUnits(allowance, decimals)),
        balance: parseFloat(ethers.utils.formatUnits(balance, decimals))
      });
    } catch (error) {
      console.error('Error getting collateral info:', error);
      setCollateralInfo({ allowance: 0, balance: 0 });
    }
  };

  // Fetch collateral info when component mounts or when asset changes
  React.useEffect(() => {
    if (selectedAsset && selectedAccount) {
      fetchCollateralInfo();
    }
  }, [selectedAsset, selectedAccount]);

  // Helper function to get wallet balance for an asset
  const getWalletBalance = (asset: AssetWithBalance): number => {
    return collateralInfo.balance;
  };

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setBorrowAmount(value);
      setError(null);
    }
  };

  // Set max amount (use allowance as max)
  const setMaxAmount = () => {
    setBorrowAmount(collateralInfo.allowance.toFixed(4));
  };

  // Handle supply submission
  const handleSupply = async (e: React.FormEvent) => {
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
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > collateralInfo.allowance) {
      setError('Amount exceeds your allowance. Please approve more tokens first.');
      return;
    }

    if (amount > collateralInfo.balance) {
      setError('Amount exceeds your wallet balance');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get signer and contracts
      const signer = await getPolkadotSigner();
      const ethers = await import('ethers');
      
      const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, signer);
      const lendingVaultContract = new ethers.Contract(LENDING_VAULT_CONTRACT, LENDING_VAULT_ABI, signer);

      // Get decimals and convert amount
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);

      const userAddress = await signer.getAddress();

      console.log('Debug info:');
      console.log('User address:', userAddress);
      console.log('Amount to deposit:', amount);
      console.log('Amount in wei:', amountWei.toString());
      console.log('Decimals:', decimals);

      // Triple-check balance and allowance with detailed logging
      const [userBalance, currentAllowance] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        tokenContract.allowance(userAddress, LENDING_VAULT_CONTRACT)
      ]);

      console.log('User balance:', ethers.utils.formatUnits(userBalance, decimals));
      console.log('Current allowance:', ethers.utils.formatUnits(currentAllowance, decimals));
      console.log('Required amount:', ethers.utils.formatUnits(amountWei, decimals));

      if (userBalance.lt(amountWei)) {
        throw new Error(`Insufficient balance. Have: ${ethers.utils.formatUnits(userBalance, decimals)}, Need: ${ethers.utils.formatUnits(amountWei, decimals)}`);
      }

      if (currentAllowance.lt(amountWei)) {
        throw new Error(`Insufficient allowance. Have: ${ethers.utils.formatUnits(currentAllowance, decimals)}, Need: ${ethers.utils.formatUnits(amountWei, decimals)}`);
      }

      // Check if the lending vault is the correct contract
      console.log('Vault contract address:', LENDING_VAULT_CONTRACT);
      
      // Try to call a read function first to make sure contract exists
      try {
        const vaultCode = await signer.provider?.getCode(LENDING_VAULT_CONTRACT);
        if (vaultCode === '0x') {
          throw new Error('Lending vault contract not found at the specified address');
        }
        console.log('Vault contract exists');
      } catch (codeError) {
        console.error('Error checking vault contract:', codeError);
        throw new Error('Failed to verify vault contract. Please check the contract address.');
      }

      // Try to estimate gas first to get better error messages
      try {
        console.log('Estimating gas...');
        const gasEstimate = await lendingVaultContract.estimateGas.depositCollateral(amountWei);
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError);
        
        // Try to decode the revert reason
        if (gasError.error && gasError.error.data) {
          console.log('Revert data:', gasError.error.data);
        }
        
        // Provide more specific error messages based on common issues
        if (gasError.message.includes('execution reverted')) {
          throw new Error('Transaction would fail. Possible issues: 1) Amount is 0, 2) Contract has insufficient allowance, 3) Vault is paused. Please check your allowance and try a smaller amount.');
        } else {
          throw new Error(`Gas estimation failed: ${gasError.message}`);
        }
      }

      // If gas estimation passes, proceed with transaction
      console.log('Depositing collateral...');
      const depositTx = await lendingVaultContract.depositCollateral(amountWei, {
        gasLimit: 300000 // Set a manual gas limit to avoid estimation issues
      });
      
      console.log('Transaction sent:', depositTx.hash);
      const receipt = await depositTx.wait();
      
      console.log('Collateral deposited successfully:', receipt.transactionHash);
      
      // Reset form on success
      setBorrowAmount('');
      
      // Refresh collateral info after successful deposit
      await fetchCollateralInfo();
      
      // Call completion callback
      onTransactionComplete?.();
      
    } catch (err: any) {
      console.error('Supply error:', err);
      
      // Handle specific error types
      if (err?.code === 4001) {
        setError('Transaction was rejected by user');
      } else if (err?.code === 'UNPREDICTABLE_GAS_LIMIT') {
        setError('Transaction would fail. Please check: 1) Your allowance is sufficient, 2) Your balance is sufficient, 3) Contract is not paused');
      } else if (err?.message?.includes('insufficient funds')) {
        setError('Insufficient funds for gas fee');
      } else if (err?.message?.includes('user rejected')) {
        setError('Transaction was rejected by user');
      } else if (err?.message?.includes('execution reverted')) {
        setError('Transaction failed. Please check your allowance and balance, then try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid for submission
  const isFormValid = selectedAsset && 
                     borrowAmount && 
                     !isNaN(parseFloat(borrowAmount)) && 
                     parseFloat(borrowAmount) > 0 && 
                     parseFloat(borrowAmount) <= collateralInfo.allowance &&
                     parseFloat(borrowAmount) <= collateralInfo.balance &&
                     walletType === 'polkadot';

  return (
    <div>
      {/* Tab Description */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <Info size={16} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Supply Collateral:</strong> Deposit tokens from Westend Asset Hub to use as collateral for borrowing. 
            You can only deposit up to your approved allowance amount.
            {collateralInfo.allowance > 0 && (
              <div className="mt-1 text-green-700 dark:text-green-300">
                ✅ Current allowance: {formatNumber(collateralInfo.allowance)} tokens
              </div>
            )}
            {collateralInfo.allowance === 0 && selectedAsset && (
              <div className="mt-1 text-amber-700 dark:text-amber-300">
                ⚠️ No allowance set. Please approve tokens first using the Approve tab.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSupply}>
        {/* Asset selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Asset to Supply
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
                    const displayBalance = getWalletBalance(asset);
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
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Balance: {formatNumber(displayBalance)}
                          </div>
                          {market && (
                            <div className="text-xs text-success-600 dark:text-success-400">
                              {market.supplyAPY.toFixed(2)}% APY
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {availableAssets.length === 0 && (
                    <div className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                      No assets available in wallet
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
              Supply Amount
            </label>
            
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center space-x-4">
              <span>
                Balance: <span className="font-medium">{formatNumber(collateralInfo.balance)} tokens</span>
              </span>
              <span>
                Allowance: <span className="font-medium">{formatNumber(collateralInfo.allowance)} tokens</span>
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
              ≈ {formatCurrency(parseFloat(borrowAmount) *10)}
            </div>
          )}
        </div>
        
        {/* Transaction details */}
        {selectedAsset && borrowAmount && !isNaN(parseFloat(borrowAmount)) && parseFloat(borrowAmount) > 0 && selectedMarket && (
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">Supply Preview</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Network</span>
                <span className="font-medium">Westend Asset Hub</span>
              </div>
              
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
                <span className="text-neutral-500 dark:text-neutral-400">Supply APY</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  {selectedMarket.supplyAPY.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Collateral Factor</span>
                <span className="font-medium">
                  {(selectedMarket.collateralFactor * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Supply Amount</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  {formatNumber(parseFloat(borrowAmount))} tokens
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Borrowing Power Added</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  {formatCurrency(parseFloat(borrowAmount) * selectedAsset.price * selectedMarket.collateralFactor)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Annual Interest Earned</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  {((parseFloat(borrowAmount) * selectedAsset.price * selectedMarket.supplyAPY) / 100).toFixed(2)} USD
                </span>
              </div>
              
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-800 dark:text-green-200">
                  💰 Supplying {formatNumber(parseFloat(borrowAmount))} tokens will earn you {selectedMarket.supplyAPY.toFixed(2)}% annual interest 
                  and increase your borrowing capacity by {formatCurrency(parseFloat(borrowAmount) * selectedAsset.price * selectedMarket.collateralFactor)}.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || collateralInfo.allowance === 0}
          className={`w-full font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
            isFormValid && !isSubmitting && collateralInfo.allowance > 0
              ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
              : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting 
            ? 'Depositing to Westend Asset Hub...' 
            : collateralInfo.allowance === 0
              ? 'No Allowance - Use Approve Tab First'
              : walletType !== 'polkadot'
                ? 'Connect Polkadot Wallet'
                : isFormValid 
                  ? 'Supply Collateral' 
                  : 'Select Asset and Amount'
          }
        </button>
      </form>
    </div>
  );
};

export default SupplyContainer;