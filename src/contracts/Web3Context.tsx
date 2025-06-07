import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Enable, web3Accounts } from '@polkadot/extension-dapp';
import { ContractPromise } from '@polkadot/api-contract';
import { WalletAccount } from '../types';

// Create the context
const Web3Context = createContext<any>(null);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [contracts, setContracts] = useState<any>({});

  // Initialize Polkadot API
  useEffect(() => {
    const initApi = async () => {
      try {
        const wsProvider = new WsProvider('ws://localhost:9944'); // Update with your Polkavm node URL
        const api = await ApiPromise.create({ provider: wsProvider });
        setApi(api);
      } catch (error) {
        console.error('Error initializing Polkadot API:', error);
      }
    };

    initApi();
  }, []);

  // Connect to wallet
  const connect = async () => {
    try {
      // Enable the extension
      const extensions = await web3Enable('PolkaLend DApp');
      
      if (extensions.length === 0) {
        throw new Error('No extension found. Please install Polkadot.js extension');
      }

      // Get all accounts
      const allAccounts = await web3Accounts();
      
      if (allAccounts.length === 0) {
        throw new Error('No accounts found. Please create an account in your wallet extension');
      }

      // Format and set the first account
      const formattedAccount = {
        address: allAccounts[0].address,
        name: allAccounts[0].meta.name || '',
        source: allAccounts[0].meta.source || ''
      };
      setAccount(formattedAccount);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  // Disconnect from wallet
  const disconnect = () => {
    setAccount(null);
  };

  // Initialize contracts when API is available
  useEffect(() => {
    if (api) {
      // Add your contract addresses here
      const contractAddresses = {
        lendingVault: 'YOUR_LENDING_VAULT_ADDRESS',
        collateralToken: 'YOUR_COLLATERAL_TOKEN_ADDRESS',
        stablecoin: 'YOUR_STABLECOIN_ADDRESS',
      };

      // Add your contract ABIs here
      const contractABIs = {
        lendingVault: {}, // Add your ABI here
        collateralToken: {}, // Add your ABI here
        stablecoin: {}, // Add your ABI here
      };

      const initializedContracts = Object.keys(contractAddresses).reduce((acc, key) => {
        acc[key] = new ContractPromise(
          api,
          contractABIs[key],
          contractAddresses[key]
        );
        return acc;
      }, {} as any);

      setContracts(initializedContracts);
    }
  }, [api]);

  return (
    <Web3Context.Provider
      value={{
        api,
        account,
        connect,
        disconnect,
        contracts,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

// Custom hook to use the Web3 context
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}; 