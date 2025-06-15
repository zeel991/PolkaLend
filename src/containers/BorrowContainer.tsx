import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useLending } from '../contexts/LendingContext';
import {  formatNumber, addCommasToNumber } from '../utils/helpers';
import { AlertCircle, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContainerProps, getAccountAddress } from '../types/lending';

// Contract addresses
const WESTEND_RPC_URL = 'https://westend-asset-hub-eth-rpc.polkadot.io';
const ERC20_TOKEN_CONTRACT = '0x1FDe1cAeCe0C9d102C5736d2AdE595Dc6cE45f1c';
const LENDING_VAULT_CONTRACT = '0x61eB150FB07c6DD742893708e6B7D7a4161BcA0C';
const MOCK_ORACLE_CONTRACT = '0x05deF0eDF0ED1773F724A9Fe121Af64267C69204'; // ⚠️ REPLACE WITH YOUR ACTUAL ORACLE ADDRESS

// ABIs
const ERC20_ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "allowance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientAllowance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSpender",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "allowance",
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
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
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
	},
	{
		"inputs": [],
		"name": "totalSupply",
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
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
];

const LENDING_VAULT_ABI = [
  // Vault data structure
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
  
  // Core lending functions
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "supplyCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "withdrawCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "borrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "repay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Configuration functions
  {
    "inputs": [],
    "name": "LTV",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "liquidationThreshold",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Token addresses
  {
    "inputs": [],
    "name": "collateralToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "stablecoin",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Oracle
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Health factor calculation
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getHealthFactor",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Liquidation function
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "liquidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "CollateralSupplied",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "CollateralWithdrawn",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Borrowed",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Repaid",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "liquidator", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "debtAmount", "type": "uint256"}
    ],
    "name": "Liquidated",
    "type": "event"
  },
  
  // Standard ERC20-like functions (if the vault also acts as a token)
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const MOCK_ORACLE_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "initialPrice",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "oldPrice",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "newPrice",
				"type": "uint256"
			}
		],
		"name": "PriceUpdated",
		"type": "event"
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
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "priceInUSD",
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
				"name": "newPrice",
				"type": "uint256"
			}
		],
		"name": "updatePrice",
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

interface BorrowContainerProps extends ContainerProps {
  availableAssets: any[];
  isAssetMenuOpen: boolean;
  setIsAssetMenuOpen: (open: boolean) => void;
  maxBorrowAmount: number;
  healthRatio: any;
  simulatedHealthRatio: any;
}

const BorrowContainer: React.FC<BorrowContainerProps> = ({
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
  
  // State for borrowing data
  const [borrowingStrength, setBorrowingStrength] = React.useState({
    collateralValueUSD: 0,
    maxBorrowableUSD: 0,
    currentDebtUSD: 0,
    availableToBorrowUSD: 0
  });
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  // Get selected market info
  const selectedMarket = selectedAsset ? markets.find(m => m.asset.id === selectedAsset.id) : null;


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

// Enhanced address debugging - replace your getEthereumAddress function and fetchBorrowingStrength

// 1. ENHANCED getEthereumAddress function with detailed logging
const getEthereumAddress = (account: any): string => {
  console.log('🔍 ADDRESS DEBUG: Full account object:', account);
  console.log('🔍 ADDRESS DEBUG: Account type:', typeof account);
  console.log('🔍 ADDRESS DEBUG: Account keys:', Object.keys(account || {}));
  
  try {
    // Try multiple ways to get the address
    const possibleAddresses = [
      account?.address,
      account?.meta?.source,
      account?.meta?.address, 
      account,
      getAccountAddress(account)
    ];
    
    console.log('🔍 ADDRESS DEBUG: Possible addresses:', possibleAddresses);
    
    // Find the first valid Ethereum address
    for (const addr of possibleAddresses) {
      if (addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) {
        console.log('✅ ADDRESS DEBUG: Using address:', addr);
        return addr;
      }
    }
    
    // If no Ethereum address found, log everything
    console.error('❌ ADDRESS DEBUG: No Ethereum address found');
    console.error('❌ ADDRESS DEBUG: Account structure:', JSON.stringify(account, null, 2));
    
    throw new Error(`No Ethereum-compatible address found. Account: ${JSON.stringify(account)}`);
  } catch (error) {
    console.error('❌ ADDRESS DEBUG: Error:', error);
    throw error;
  }
};

// 2. ENHANCED fetchBorrowingStrength with address verification

  // Fetch borrowing strength when component mounts or account changes
  React.useEffect(() => {
    if (selectedAccount) {
      fetchBorrowingStrength();
    }
  }, [selectedAccount]);

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setBorrowAmount(value);
      setError(null);
      
      if (value && !isNaN(parseFloat(value))) {
        const amount = parseFloat(value);
        if (amount > borrowingStrength.availableToBorrowUSD) {
          setError(`Amount exceeds your borrowing strength ($${formatNumber(borrowingStrength.availableToBorrowUSD)})`);
        }
      }
    }
  };

  // Set max amount (use available borrowing strength)
  const setMaxAmount = () => {
    setBorrowAmount(borrowingStrength.availableToBorrowUSD.toString());
    setError(null);
  };

  // Handle borrow submission
// Enhanced borrow function with detailed debugging

// Add this error decoding function at the top of your BorrowContainer component (before handleBorrow)

// Add this function to debug and verify your contract
const verifyContractFunctions = async () => {
  try {
    const ethers = await import('ethers');
    const provider = new ethers.providers.JsonRpcProvider(WESTEND_RPC_URL);
    
    console.log('🔍 VERIFYING CONTRACT FUNCTIONS:');
    console.log('  - Contract address:', LENDING_VAULT_CONTRACT);
    
    // Check if the contract exists
    const code = await provider.getCode(LENDING_VAULT_CONTRACT);
    if (code === '0x') {
      console.error('❌ No contract found at this address!');
      return;
    }
    console.log('✅ Contract found');
    
    // Test each critical function
    const vaultContract = new ethers.Contract(LENDING_VAULT_CONTRACT, LENDING_VAULT_ABI, provider);
    
    // Test basic functions
    try {
      const ltv = await vaultContract.LTV();
      console.log('✅ LTV function works:', ltv.toString());
    } catch (e) {
      console.error('❌ LTV function failed:', e);
    }
    
    try {
      const collateralToken = await vaultContract.collateralToken();
      console.log('✅ collateralToken function works:', collateralToken);
    } catch (e) {
      console.error('❌ collateralToken function failed:',  (e as Error).message);
    }
    
    try {
      const stablecoin = await vaultContract.stablecoin();
      console.log('✅ stablecoin function works:', stablecoin);
    } catch (e) {
      console.error('❌ stablecoin function failed:', (e as Error).message);
    }
    
    // Test with a dummy address
    try {
      const dummyAddress = '0x0000000000000000000000000000000000000001';
      const vaultData = await vaultContract.vaults(dummyAddress);
      console.log('✅ vaults function works:', {
        collateralAmount: vaultData.collateralAmount.toString(),
        debtAmount: vaultData.debtAmount.toString()
      });
    } catch (e) {
      console.error('❌ vaults function failed:',  (e as Error).message);
    }
    
  } catch (error) {
    console.error('❌ Contract verification failed:', error);
  }
};

// Call this function to test your contract
verifyContractFunctions();
const decodeContractError = (errorData: string): string => {
  const errorSignature = errorData.slice(0, 10);
  const knownErrors: { [key: string]: string } = {
    '0x118cdaa7': 'Custom lending error - likely insufficient collateral or LTV exceeded',
    '0x08c379a0': 'Revert with reason string',
    '0x4e487b71': 'Panic error (arithmetic overflow/underflow)',
    '0x50dc905c': 'Insufficient collateral',
    '0x3f68b561': 'LTV ratio exceeded'
  };
  return knownErrors[errorSignature] || `Unknown contract error: ${errorSignature}`;
};

const fetchBorrowingStrength = async () => {
  try {
    if (!selectedAccount) {
      setBorrowingStrength({
        collateralValueUSD: 0,
        maxBorrowableUSD: 0,
        currentDebtUSD: 0,
        availableToBorrowUSD: 0
      });
      return;
    }

    setIsLoadingData(true);
    const ethers = await import('ethers');
    const provider = new ethers.providers.JsonRpcProvider(WESTEND_RPC_URL);
    
    const vaultContract = new ethers.Contract(LENDING_VAULT_CONTRACT, LENDING_VAULT_ABI, provider);
    const oracleContract = new ethers.Contract(MOCK_ORACLE_CONTRACT, MOCK_ORACLE_ABI, provider);
    const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, provider);

    const userAddress = getEthereumAddress(selectedAccount);

    const [vaultData, oraclePrice, ltv, collateralDecimals] = await Promise.all([
      vaultContract.vaults(userAddress),
      oracleContract.getPrice(),
      vaultContract.LTV(),
      tokenContract.decimals()
    ]);

    const collateralAmount = vaultData.collateralAmount;
    const currentDebtUSD = vaultData.debtAmount;

    console.log('🔍 ENHANCED DEBUG: Raw contract values:');
    console.log('  - Collateral amount (raw):', collateralAmount.toString());
    console.log('  - Oracle price (raw):', oraclePrice.toString());
    console.log('  - LTV:', ltv.toString());
    console.log('  - Token decimals:', collateralDecimals.toString());
    console.log('  - Current debt USD:', currentDebtUSD.toString());

    // Convert to human readable for verification
    console.log('🔍 ENHANCED DEBUG: Human readable values:');
    console.log('  - Collateral amount:', ethers.utils.formatUnits(collateralAmount, collateralDecimals), 'tokens');
    console.log('  - Oracle price: $', ethers.utils.formatUnits(oraclePrice, 18));

    if (collateralAmount.isZero()) {
      console.log('⚠️ No collateral found');
      setBorrowingStrength({
        collateralValueUSD: 0,
        maxBorrowableUSD: 0,
        currentDebtUSD: parseFloat(currentDebtUSD.toString()),
        availableToBorrowUSD: 0
      });
      return;
    }

    // FIXED CALCULATION - Use manual calculation to avoid decimal issues
    const collateralTokens = parseFloat(ethers.utils.formatUnits(collateralAmount, collateralDecimals));
    const priceUSD = parseFloat(ethers.utils.formatUnits(oraclePrice, 18));
    const ltvPercent = parseFloat(ltv.toString());
    const currentDebt = parseFloat(currentDebtUSD.toString());

    console.log('🔍 ENHANCED DEBUG: Manual calculation:');
    console.log('  - Collateral tokens:', collateralTokens);
    console.log('  - Price USD:', priceUSD);
    console.log('  - LTV percent:', ltvPercent);
    console.log('  - Current debt:', currentDebt);

    // Simple JavaScript math (no BigNumber complications)
    const collateralValueUSD = collateralTokens * priceUSD;
    const maxBorrowableUSD = collateralValueUSD * (ltvPercent / 100);
    const availableToBorrowUSD = Math.max(0, maxBorrowableUSD - currentDebt);

    console.log('🔍 ENHANCED DEBUG: Final calculated values:');
    console.log('  - Collateral value USD:', collateralValueUSD);
    console.log('  - Max borrowable USD:', maxBorrowableUSD);
    console.log('  - Available to borrow USD:', availableToBorrowUSD);

    setBorrowingStrength({
      collateralValueUSD,
      maxBorrowableUSD,
      currentDebtUSD: currentDebt,
      availableToBorrowUSD
    });

  } catch (error) {
    console.error('❌ fetchBorrowingStrength error:', error);
    setBorrowingStrength({
      collateralValueUSD: 0,
      maxBorrowableUSD: 0,
      currentDebtUSD: 0,
      availableToBorrowUSD: 0
    });
    setError(`Error: ${error}`);
  } finally {
    setIsLoadingData(false);
  }
};

// REPLACE your handleBorrow function with this enhanced debug version:
const handleBorrow = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedAsset) {
    setError('Please select an asset to borrow');
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

  console.log('🔍 ENHANCED BORROW DEBUG: Starting...');
  console.log('🔍 Amount requested (USD):', amount);
  console.log('🔍 UI shows available:', borrowingStrength.availableToBorrowUSD);

  try {
    setIsSubmitting(true);
    setError(null);
    
    const signer = await getPolkadotSigner();
    const ethers = await import('ethers');
    
    const lendingVaultContract = new ethers.Contract(LENDING_VAULT_CONTRACT, LENDING_VAULT_ABI, signer);
    const vaultContractRead = new ethers.Contract(LENDING_VAULT_CONTRACT, LENDING_VAULT_ABI, signer.provider);
    const oracleContract = new ethers.Contract(MOCK_ORACLE_CONTRACT, MOCK_ORACLE_ABI, signer.provider);
    const tokenContract = new ethers.Contract(ERC20_TOKEN_CONTRACT, ERC20_ABI, signer.provider);

    const userAddress = getEthereumAddress(selectedAccount);

    // Get fresh contract state
    const [currentVaultData, currentLTV, currentOraclePrice, tokenDecimals] = await Promise.all([
      vaultContractRead.vaults(userAddress),
      vaultContractRead.LTV(),
      oracleContract.getPrice(),
      tokenContract.decimals()
    ]);

    console.log('🔍 ENHANCED BORROW DEBUG: Fresh contract state:');
    console.log('  - Collateral (raw):', currentVaultData.collateralAmount.toString());
    console.log('  - Current debt (USD):', currentVaultData.debtAmount.toString());
    console.log('  - Oracle price (raw):', currentOraclePrice.toString());
    console.log('  - LTV:', currentLTV.toString() + '%');

    if (currentVaultData.collateralAmount.isZero()) {
      setError('❌ No collateral deposited. Please supply collateral first.');
      return;
    }

    // Calculate actual borrowing capacity using same method as UI
    const collateralTokens = parseFloat(ethers.utils.formatUnits(currentVaultData.collateralAmount, tokenDecimals));
    const priceUSD = parseFloat(ethers.utils.formatUnits(currentOraclePrice, 18));
    const ltvPercent = parseFloat(currentLTV.toString());
    const currentDebt = parseFloat(currentVaultData.debtAmount.toString());

    const actualCollateralValueUSD = collateralTokens * priceUSD;
    const actualMaxBorrowableUSD = actualCollateralValueUSD * (ltvPercent / 100);
    const actualAvailableToBorrowUSD = Math.max(0, actualMaxBorrowableUSD - currentDebt);

    console.log('🔍 ENHANCED BORROW DEBUG: Actual borrowing capacity:');
    console.log('  - Actual collateral value USD:', actualCollateralValueUSD);
    console.log('  - Actual max borrowable USD:', actualMaxBorrowableUSD);
    console.log('  - Actual available USD:', actualAvailableToBorrowUSD);
    console.log('  - Requested amount USD:', amount);
    console.log('  - Amount within limit:', amount <= actualAvailableToBorrowUSD);

    if (amount > actualAvailableToBorrowUSD) {
      setError(`❌ Amount exceeds actual limit. You can borrow max $${Math.floor(actualAvailableToBorrowUSD)}.`);
      return;
    }



    // Now test the actual requested amount
    const borrowAmountUSD = Math.floor(amount);
    

    // Execute the transaction
    console.log('🔍 ENHANCED BORROW DEBUG: Executing transaction...');
    
    const gasEstimate = await lendingVaultContract.estimateGas.borrow(borrowAmountUSD);
    console.log('✅ Gas estimate:', gasEstimate.toString());
    
    const borrowTx = await lendingVaultContract.borrow(borrowAmountUSD, {
      gasLimit: gasEstimate.mul(120).div(100)
    });
    
    console.log('✅ Transaction sent:', borrowTx.hash);
    const receipt = await borrowTx.wait();
    console.log('✅ Transaction confirmed:', receipt.transactionHash);
    
    // Success!
    setBorrowAmount('');
    await fetchBorrowingStrength();
    onTransactionComplete?.();
    
  } catch (err: any) {
    console.error('❌ Final error:', err);
    
    if (err?.data) {
      setError(`❌ ${decodeContractError(err.data)}`);
    } else if (err?.code === 4001) {
      setError('Transaction rejected by user');
    } else if (err?.message?.includes('insufficient funds')) {
      setError('Insufficient funds for gas fee');
    } else {
      setError(err.message || 'Unknown error occurred');
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
                     parseFloat(borrowAmount) <= borrowingStrength.availableToBorrowUSD &&
                     borrowingStrength.collateralValueUSD > 0 &&
                     walletType === 'polkadot';

  return (
    <div>
      {/* Tab Description */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <Info size={16} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Borrow Assets:</strong> Borrow stablecoins against your deposited collateral on Westend Asset Hub.
            {borrowingStrength.collateralValueUSD > 0 && (
              <div className="mt-1 text-green-700 dark:text-green-300">
                ✅ Borrowing Strength: ${formatNumber(borrowingStrength.availableToBorrowUSD)} available
              </div>
            )}
            {borrowingStrength.collateralValueUSD === 0 && (
              <div className="mt-1 text-amber-700 dark:text-amber-300">
                ⚠️ No collateral deposited. Please supply collateral first using the Supply tab.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <form onSubmit={handleBorrow}>
        {/* Asset selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Asset to Borrow
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
                          {market && (
                            <div className="text-xs text-error-600 dark:text-error-400">
                              {market.borrowAPY.toFixed(2)}% APY
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {availableAssets.length === 0 && (
                    <div className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                      No assets available for borrowing
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
              Borrow Amount (USD)
            </label>
            
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center space-x-4">
              <span>
                Borrowing Strength: <span className="font-medium">${isLoadingData ? '...' : formatNumber(borrowingStrength.availableToBorrowUSD)}</span>
              </span>
              <button
                type="button"
                onClick={setMaxAmount}
                disabled={isLoadingData || borrowingStrength.availableToBorrowUSD === 0}
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
        
        {/* Borrowing strength details */}
        {borrowingStrength.collateralValueUSD > 0 && (
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">Your Borrowing Position</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Network</span>
                <span className="font-medium">Westend Asset Hub</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Collateral Value</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  ${formatNumber(borrowingStrength.collateralValueUSD)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Current Debt</span>
                <span className="font-medium text-error-600 dark:text-error-400">
                  ${formatNumber(borrowingStrength.currentDebtUSD)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Max Borrowable (75% LTV)</span>
                <span className="font-medium">
                  ${formatNumber(borrowingStrength.maxBorrowableUSD)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Available to Borrow</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  ${formatNumber(borrowingStrength.availableToBorrowUSD)}
                </span>
              </div>
              
              {borrowAmount && !isNaN(parseFloat(borrowAmount)) && parseFloat(borrowAmount) > 0 && (
                <>
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
                  
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      💰 Borrowing ${formatNumber(parseFloat(borrowAmount))} will increase your debt and reduce your health factor.
                      {selectedMarket && (
                        <span> You'll pay {selectedMarket.borrowAPY.toFixed(2)}% APY on this loan.</span>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Submit button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || borrowingStrength.collateralValueUSD === 0}
          className={`w-full font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
            isFormValid && !isSubmitting && borrowingStrength.collateralValueUSD > 0
              ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
              : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting 
            ? 'Borrowing from Westend Asset Hub...' 
            : borrowingStrength.collateralValueUSD === 0
              ? 'No Collateral - Supply Collateral First'
              : walletType !== 'polkadot'
                ? 'Connect Polkadot Wallet'
                : isFormValid 
                  ? 'Borrow Assets' 
                  : 'Select Asset and Amount'
          }
        </button>
      </form>
    </div>
  );
};

export default BorrowContainer;