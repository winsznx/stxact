'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppConfig, UserSession, type UserData } from '@stacks/connect';
import { Connect, useConnect } from '@stacks/connect-react';
import { useHydrated } from '@/hooks/useHydrated';

interface WalletContextType {
  address: string | null;
  userData: UserData | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (redirectTo?: string | null) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const appConfig = new AppConfig(['store_write', 'publish_data']);

function getSession() {
  if (typeof window !== 'undefined') {
    return new UserSession({ appConfig });
  }
  return undefined;
}

function getAddressFromUserData(userData: UserData) {
  const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet';
  const profile = userData.profile as {
    stxAddress?: {
      mainnet?: string;
      testnet?: string;
    };
  };

  return isMainnet ? profile.stxAddress?.mainnet ?? null : profile.stxAddress?.testnet ?? null;
}

function WalletStateProvider({ children }: { children: React.ReactNode }) {
  const { authenticate, userSession } = useConnect();
  const router = useRouter();
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const userData = useMemo<UserData | null>(() => {
    if (!userSession?.isUserSignedIn()) {
      return null;
    }

    return userSession.loadUserData();
  }, [userSession]);

  const address = useMemo(() => (userData ? getAddressFromUserData(userData) : null), [userData]);

  useEffect(() => {
    if (!address) {
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

  const connect = (redirectTo: string | null = '/seller') => {
    setIsConnecting(true);
    authenticate({
      onFinish: (payload) => {
        const session = payload.userSession || userSession;
        if (session?.isUserSignedIn() && redirectTo) {
          router.push(redirectTo);
        }
        setIsConnecting(false);
      },
      onCancel: () => {
        setIsConnecting(false);
      },
      appDetails: {
        name: 'stxact',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/icon` : '/icon',
      },
    });
  };

  const disconnect = () => {
    userSession?.signUserOut();
    setIsConnecting(false);
  };

  const value = {
    address,
    userData,
    balance: address ? balance : null,
    isConnected: !!address,
    isConnecting,
    connect,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const [session] = useState<UserSession | undefined>(() => getSession());

  if (!hydrated || !session) return <>{children}</>;

  const authOptions = {
    appDetails: {
      name: 'stxact',
      icon: typeof window !== 'undefined' ? `${window.location.origin}/icon` : '/icon',
    },
    userSession: session,
  };

  return (
    <Connect authOptions={authOptions}>
      <WalletStateProvider>{children}</WalletStateProvider>
    </Connect>
  );
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
