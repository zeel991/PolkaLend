// src/hooks/useLendingData.ts
import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext'; // Assuming this provides selectedAccount
import { ethers } from 'ethers'; // If you need ethers in the hook

const CONTRACT_ADDRESS = '0x722F539B007021Db6f1313E3Ce500c2bEd12fD37';
const MOCK_ORACLE_ADDRESS = '0x3753e84bb63B833635Ba081D203BFc7f91E029e0';
const RPC_URL = 'https://westend-asset-hub-eth-rpc.polkadot.io';

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
    ]
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

export const useLendingData = () => {
  const { selectedAccount } = useWallet();
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [oraclePrice, setOraclePrice] = useState<OraclePrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch oracle price
  const fetchOraclePrice = async () => {
    try {
      const getPriceSelector = '0x98d5fdca';
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: MOCK_ORACLE_ADDRESS, data: getPriceSelector }, 'latest'],
          id: 1
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const priceBigInt = BigInt(data.result);
      const decimals = 8;
      const divisor = BigInt(10) ** BigInt(decimals);
      const formattedPrice = (Number(priceBigInt) / Number(divisor));

      setOraclePrice({
        price: priceBigInt.toString(),
        formattedPrice: formattedPrice.toFixed(8),
        decimals: decimals
      });
    } catch (err: any) {
      console.error('Error fetching oracle price:', err);
      setError('Failed to fetch oracle price');
    }
  };

  // Function to fetch token balance
  const fetchTokenBalance = async (userAddress: string) => {
    if (!userAddress) return;
    try {
      const makeRpcCall = async (method: string, params: any[] = []) => {
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: CONTRACT_ADDRESS, data: method }, 'latest'],
            id: 1
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
      };

      const balanceOfSelector = '0x70a08231';
      const decimalsSelector = '0x313ce567';
      const nameSelector = '0x06fdde03';
      const symbolSelector = '0x95d89b41';

      const paddedAddress = userAddress.toLowerCase().replace('0x', '').padStart(64, '0');

      const [balanceResult, decimalsResult, nameResult, symbolResult] = await Promise.all([
        makeRpcCall(balanceOfSelector + paddedAddress),
        makeRpcCall(decimalsSelector),
        makeRpcCall(nameSelector),
        makeRpcCall(symbolSelector)
      ]);

      const balance = BigInt(balanceResult);
      const decimals = parseInt(decimalsResult, 16);

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

      const divisor = BigInt(10) ** BigInt(decimals);
      const formattedBalance = (Number(balance) / Number(divisor)).toString();

      setTokenBalance({
        balance: formattedBalance,
        decimals: decimals,
        name: name || 'Unknown Token',
        symbol: symbol || 'UNK'
      });
    } catch (err: any) {
      console.error('Error fetching token balance:', err);
      setError('Failed to fetch token balance');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      await fetchOraclePrice();
      if (selectedAccount?.address) {
        await fetchTokenBalance(selectedAccount.address);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [selectedAccount?.address]);

  // For the purpose of this hook, we'll simplify net worth calculation
  // In a real app, you might also want to pass `userPositions` from `useLending` context
  // or fetch them here if `useLending` isn't always available where this hook is used.
  const calculateNetWorth = () => {
    let contractTokenValue = 0;
    if (tokenBalance && oraclePrice) {
      const tokenPrice = parseFloat(oraclePrice.formattedPrice);
      contractTokenValue = parseFloat(tokenBalance.balance) * tokenPrice;
    }
    // Assuming totalSupplied and totalBorrowed are zero or will be passed in
    // For a complete net worth, you'd integrate with useLending as well.
    // E.g., const { userPositions } = useLending();
    // const totalSupplied = userPositions.reduce(...)
    // const totalBorrowed = userPositions.reduce(...)
    return contractTokenValue; // Simplified for now
  };

  return {
    netWorth: calculateNetWorth(),
    oraclePrice,
    tokenBalance,
    isLoading,
    error,
    refreshData: () => {
      fetchOraclePrice();
      if (selectedAccount?.address) {
        fetchTokenBalance(selectedAccount.address);
      }
    }
  };
};