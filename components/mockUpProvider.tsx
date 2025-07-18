/**
 * @component MockUpProvider
 * @description Mock context provider for local testing without wallet connection
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
} from "react";
import { createWalletClient, http } from "viem";
import { luksoTestnet } from "viem/chains";

interface UpProviderContext {
  provider: any;
  client: ReturnType<typeof createWalletClient> | null;
  chainId: number;
  accounts: Array<`0x${string}`>;
  contextAccounts: Array<`0x${string}`>;
  walletConnected: boolean;
  selectedAddress: `0x${string}` | null;
  setSelectedAddress: (address: `0x${string}` | null) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
}

const UpContext = createContext<UpProviderContext | undefined>(undefined);

export function useUpProvider() {
  const context = useContext(UpContext);
  if (!context) {
    throw new Error("useUpProvider must be used within a UpProvider");
  }
  return context;
}

interface UpProviderProps {
  children: ReactNode;
}

export function UpProvider({ children }: UpProviderProps) {
  const [selectedAddress, setSelectedAddress] = useState<`0x${string}` | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Mock values for local testing
  const mockAccounts: Array<`0x${string}`> = ["0x1234567890123456789012345678901234567890"];
  const mockChainId = 4201; // Lukso testnet
  const mockWalletConnected = true; // Always connected for testing

  // Create a mock client
  const client = useMemo(() => {
    return createWalletClient({
      chain: luksoTestnet,
      transport: http(),
    });
  }, []);

  const data = useMemo(() => {
    return {
      provider: null,
      client,
      chainId: mockChainId,
      readClient: client,
      accounts: mockAccounts,
      contextAccounts: mockAccounts,
      walletConnected: mockWalletConnected,
      selectedAddress,
      setSelectedAddress,
      isSearching,
      setIsSearching,
    };
  }, [
    client,
    selectedAddress,
    isSearching,
  ]);

  return (
    <UpContext.Provider value={data}>
      <div className="min-h-screen flex items-center justify-center">
        {children}
      </div>
    </UpContext.Provider>
  );
}