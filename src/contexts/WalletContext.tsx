import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import {
  web3Enable,
  web3Accounts,
  web3FromSource,
} from "@polkadot/extension-dapp";
import type { InjectedExtension } from "@polkadot/extension-inject/types";
import { ethers } from "ethers";

// --- Types ---
export type WalletType = "ethereum" | "polkadot";
export type PolkadotSource = "talisman" | "subwallet-js" | "polkadot-js";
export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface WalletAccount {
  address: string;
  name: string;
  source: string;
}

interface WalletContextType {
  accounts: WalletAccount[];
  selectedAccount: WalletAccount | null;
  status: WalletStatus;
  extensions: InjectedExtension[];
  walletType: WalletType | null;
  polkadotSource: PolkadotSource | null;
  connectWallet: (type: WalletType, source?: PolkadotSource) => Promise<void>;
  disconnectWallet: () => void;
  selectAccount: (account: WalletAccount) => void;
  provider: ethers.providers.Web3Provider | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const WalletProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(
    null
  );
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [extensions, setExtensions] = useState<InjectedExtension[]>([]);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [polkadotSource, setPolkadotSource] = useState<PolkadotSource | null>(
    null
  );
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(
    null
  );

  const connectWallet = async (
    type: WalletType,
    source?: PolkadotSource
  ) => {
    try {
      setStatus("connecting");
      setWalletType(type);

      if (type === "polkadot") {
        if (!source)
          throw new Error("No Polkadot wallet source specified");

        setPolkadotSource(source);
        
        // Enable web3 and get extensions
        const extensions = await web3Enable("Your App");
        const extension = extensions.find((ext) => ext.name === source);

        if (!extension) {
          const walletNames = {
            "talisman": "Talisman",
            "subwallet-js": "SubWallet", 
            "polkadot-js": "Polkadot.js"
          };
          throw new Error(`Please install ${walletNames[source]} extension`);
        }

        // Clear any existing connections first
        setAccounts([]);
        setSelectedAccount(null);

        // Request accounts - this should trigger the popup
        console.log(`Requesting accounts from ${source}...`);
        const accounts = await extension.accounts.get();
        
        if (accounts.length === 0) {
          // If no accounts, try alternative method using web3Accounts
          console.log("No accounts from extension.accounts.get(), trying web3Accounts...");
          const allAccounts = await web3Accounts();
          const sourceAccounts = allAccounts.filter(acc => 
            acc.meta.source === source
          );
          
          if (sourceAccounts.length === 0) {
            const walletNames = {
              "talisman": "Talisman",
              "subwallet-js": "SubWallet",
              "polkadot-js": "Polkadot.js"
            };
            throw new Error(
              `No accounts found in ${walletNames[source]}. Please create an account or check permissions.`
            );
          }

          const formattedAccounts = sourceAccounts.map((account) => ({
            address: account.address,
            name: account.meta.name || "",
            source: source,
          }));

          setAccounts(formattedAccounts);
          setSelectedAccount(formattedAccounts[0]);
        } else {
          const formattedAccounts = accounts.map((account) => ({
            address: account.address,
            name: account.name || "",
            source: source,
          }));

          setAccounts(formattedAccounts);
          setSelectedAccount(formattedAccounts[0]);
        }

        setStatus("connected");
        setExtensions([extension]);
        
        // Store connection info
        localStorage.setItem("walletConnected", "true");
        localStorage.setItem("walletType", "polkadot");
        localStorage.setItem("polkadotSource", source);
        localStorage.setItem(
          "selectedAccount",
          JSON.stringify(accounts[0] ? {
            address: accounts[0].address,
            name: accounts[0].name || "",
            source: source,
          } : null)
        );

      } else if (type === "ethereum") {
        setPolkadotSource(null);
        
        // Clear any existing connections first
        setAccounts([]);
        setSelectedAccount(null);
        
        // Find MetaMask provider
        let ethProvider = null;
        if (window.ethereum?.providers) {
          ethProvider = window.ethereum.providers.find((p: any) => p.isMetaMask);
        } else if (window.ethereum?.isMetaMask) {
          ethProvider = window.ethereum;
        }

        if (!ethProvider) {
          throw new Error("Please install MetaMask to use this feature");
        }

        // Request accounts - this triggers MetaMask popup
        console.log("Requesting MetaMask accounts...");
        const accounts = await ethProvider.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length === 0) {
          throw new Error("No accounts selected in MetaMask");
        }

        const ethersProvider = new ethers.providers.Web3Provider(ethProvider);
        setProvider(ethersProvider);

        const formattedAccounts = accounts.map((address: string, index: number) => ({
          address,
          name: `MetaMask Account ${index + 1}`,
          source: "metamask",
        }));

        setAccounts(formattedAccounts);
        setSelectedAccount(formattedAccounts[0]);
        setStatus("connected");
        setExtensions([]);
        
        // Store connection info
        localStorage.setItem("walletConnected", "true");
        localStorage.setItem("walletType", "ethereum");
        localStorage.removeItem("polkadotSource");
        localStorage.setItem(
          "selectedAccount",
          JSON.stringify(formattedAccounts[0])
        );
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setStatus("error");
      
      // Clear any partial state
      setAccounts([]);
      setSelectedAccount(null);
      setProvider(null);
      setWalletType(null);
      setPolkadotSource(null);
      
      throw error;
    }
  };

  // Enhanced MetaMask account change listener
  useEffect(() => {
    if (walletType === "ethereum" && window.ethereum) {
      let ethProvider = null;
      if (window.ethereum.providers) {
        ethProvider = window.ethereum.providers.find((p: any) => p.isMetaMask);
      } else if (window.ethereum.isMetaMask) {
        ethProvider = window.ethereum;
      }
      
      if (!ethProvider) return;

      const handleAccountsChanged = (newAccounts: string[]) => {
        console.log("MetaMask accounts changed:", newAccounts);
        if (newAccounts.length === 0) {
          disconnectWallet();
        } else {
          const formattedAccounts = newAccounts.map((address, index) => ({
            address,
            name: `MetaMask Account ${index + 1}`,
            source: "metamask",
          }));
          setAccounts(formattedAccounts);
          setSelectedAccount(formattedAccounts[0]);
          localStorage.setItem(
            "selectedAccount",
            JSON.stringify(formattedAccounts[0])
          );
        }
      };

      const handleChainChanged = (chainId: string) => {
        console.log("MetaMask chain changed:", chainId);
        // Optionally refresh the connection or update UI
      };

      ethProvider.on("accountsChanged", handleAccountsChanged);
      ethProvider.on("chainChanged", handleChainChanged);
      
      return () => {
        ethProvider.removeListener("accountsChanged", handleAccountsChanged);
        ethProvider.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [walletType]);

  const disconnectWallet = () => {
    setAccounts([]);
    setSelectedAccount(null);
    setStatus("disconnected");
    setExtensions([]);
    setProvider(null);
    setWalletType(null);
    setPolkadotSource(null);
    
    // Clear localStorage
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletType");
    localStorage.removeItem("polkadotSource");
    localStorage.removeItem("selectedAccount");
  };

  const selectAccount = (account: WalletAccount) => {
    setSelectedAccount(account);
    localStorage.setItem("selectedAccount", JSON.stringify(account));
  };

  // Modified auto-reconnect logic
  useEffect(() => {
    const walletConnected = localStorage.getItem("walletConnected") === "true";
    const savedWalletType = localStorage.getItem("walletType") as WalletType;
    const savedPolkadotSource = localStorage.getItem(
      "polkadotSource"
    ) as PolkadotSource;

    // Only auto-reconnect if we have the necessary info
    if (walletConnected && savedWalletType) {
      // Don't auto-reconnect on page load - let user manually connect
      // This ensures fresh popup experience
      console.log("Previous wallet connection detected. Click connect to restore.");
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        accounts,
        selectedAccount,
        status,
        extensions,
        walletType,
        polkadotSource,
        connectWallet,
        disconnectWallet,
        selectAccount,
        provider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};