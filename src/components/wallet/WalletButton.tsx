import React, { useState } from "react";
import { useWallet } from "../../contexts/WalletContext";
import { Wallet } from "lucide-react";

const WALLET_OPTIONS = [
  {
    label: "🧿 Talisman (Polkadot)",
    type: "polkadot",
    source: "talisman",
  },
  {
    label: "🦄 SubWallet (Polkadot)",
    type: "polkadot",
    source: "subwallet-js",
  },
  {
    label: "🦓 Polkadot.js (Polkadot)",
    type: "polkadot",
    source: "polkadot-js",
  },
];

const WalletButton: React.FC = () => {
  const {
    connectWallet,
    disconnectWallet,
    status,
    selectedAccount,
    walletType,
    polkadotSource,
  } = useWallet();

  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleConnect = async (
    type: "ethereum" | "polkadot",
    source?: string
  ) => {
    try {
      setError(null);
      setShowMenu(false);
      await connectWallet(type, source as any);
    } catch (err) {
      setShowMenu(true);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to connect wallet");
      }
    }
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  let buttonText = "Connect Wallet";
  if (status === "connecting") buttonText = "Connecting...";
  else if (status === "connected" && selectedAccount) {
    if (walletType === "ethereum") {
      buttonText = `ETH: ${shortenAddress(selectedAccount.address)}`;
    } else if (walletType === "polkadot" && polkadotSource) {
      let prefix = "";
      if (polkadotSource === "talisman") prefix = "TAL";
      else if (polkadotSource === "subwallet-js") prefix = "SUB";
      else if (polkadotSource === "polkadot-js") prefix = "DOT";
      buttonText = `${prefix}: ${shortenAddress(selectedAccount.address)}`;
    }
  } else if (status === "error") buttonText = "Retry Connection";

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => {
          if (status === "connected") {
            disconnectWallet();
          } else {
            setShowMenu((prev) => !prev);
          }
        }}
        disabled={status === "connecting"}
        className="flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg px-4 py-2 transition-all duration-200 disabled:opacity-70"
      >
        <Wallet size={18} />
        <span>{buttonText}</span>
      </button>

      {showMenu && (
        <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1 text-gray-700">
            {WALLET_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() =>
                  handleConnect(opt.type as any, opt.source as any)
                }
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute mt-2 p-2 bg-red-100 text-red-800 text-sm rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletButton;
