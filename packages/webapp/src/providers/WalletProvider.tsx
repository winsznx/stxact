'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connect as connectWallet, disconnect as disconnectWallet, getLocalStorage } from '@stacks/connect';
import { useRouter } from 'next/navigation';
import { useHydrated } from '@/hooks/useHydrated';

interface WalletContextType {
  address: string | null;
  userData: null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (redirectTo?: string | null) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function readAddressFromStorage(): string | null {
  const data = getLocalStorage();
  return data?.addresses?.stx?.[0]?.address ?? null;
}

function WalletStateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectTimeoutRef = useRef<number | null>(null);

  const refreshWalletState = () => {
    setAddress(readAddressFromStorage());
  };

  useEffect(() => {
    refreshWalletState();

    const syncWalletState = () => refreshWalletState();

    window.addEventListener('storage', syncWalletState);
    window.addEventListener('focus', syncWalletState);
    document.addEventListener('visibilitychange', syncWalletState);

    return () => {
      window.removeEventListener('storage', syncWalletState);
      window.removeEventListener('focus', syncWalletState);
      document.removeEventListener('visibilitychange', syncWalletState);
    };
  }, []);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return undefined;
    }

    let active = true;

    const fetchBalance = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
        const response = await fetch(`${apiUrl}/extended/v1/address/${address}/balances`);
        const data = (await response.json()) as {
          stx?: {
            balance?: string;
          };
        };

        if (active) {
          setBalance(data.stx?.balance ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    void fetchBalance();

    return () => {
      active = false;
    };
  }, [address]);

  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current !== null) {
        window.clearTimeout(connectTimeoutRef.current);
      }
    };
  }, []);

  const clearConnectTimeout = () => {
    if (connectTimeoutRef.current !== null) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  const connect = (redirectTo: string | null = null) => {
    clearConnectTimeout();
    setIsConnecting(true);

    connectTimeoutRef.current = window.setTimeout(() => {
      console.error('Wallet connection timed out before local state updated');
      connectTimeoutRef.current = null;
      refreshWalletState();
      setIsConnecting(false);
    }, 15_000);

    void (async () => {
      try {
        await connectWallet({
          forceWalletSelect: true,
          network: process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        });

        refreshWalletState();
        clearConnectTimeout();
        setIsConnecting(false);

        if (readAddressFromStorage() && redirectTo) {
          router.push(redirectTo);
        }
      } catch (error) {
        clearConnectTimeout();
        console.error('Failed to connect wallet', error);
        refreshWalletState();
        setIsConnecting(false);
      }
    })();
  };

  const disconnect = () => {
    disconnectWallet();
    clearConnectTimeout();
    setIsConnecting(false);
    setAddress(null);
    setBalance(null);
  };

  const value = {
    address,
    userData: null,
    balance,
    isConnected: !!address,
    isConnecting,
    connect,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();

  if (!hydrated) return <>{children}</>;

  return <WalletStateProvider>{children}</WalletStateProvider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    return {
      address: null,
      userData: null,
      balance: null,
      isConnected: false,
      isConnecting: false,
      connect: () => {},
      disconnect: () => {},
    };
  }
  return context;
}
