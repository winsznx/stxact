'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppConfig, UserSession } from '@stacks/connect';
import { Connect, useConnect } from '@stacks/connect-react';

interface WalletContextType {
    address: string | null;
    userData: any | null;
    balance: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => void;
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

function WalletStateProvider({ children }: { children: React.ReactNode }) {
    const { authenticate, userSession } = useConnect();
    const router = useRouter();
    const [address, setAddress] = useState<string | null>(null);
    const [userData, setUserData] = useState<any | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const fetchBalance = useCallback(async (addr: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
            const response = await fetch(`${apiUrl}/extended/v1/address/${addr}/balances`);
            const data = await response.json();
            setBalance(data.stx.balance);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    }, []);

    const syncState = useCallback((sessionOverride?: UserSession) => {
        const session = sessionOverride || userSession;
        if (session && session.isUserSignedIn()) {
            const data = session.loadUserData();
            setUserData(data);
            const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet';
            const addr = isMainnet ? data.profile.stxAddress.mainnet : data.profile.stxAddress.testnet;
            setAddress(addr);
            fetchBalance(addr);
        } else {
            setAddress(null);
            setUserData(null);
            setBalance(null);
        }
    }, [userSession, fetchBalance]);

    useEffect(() => {
        syncState();
    }, [syncState]);

    const connect = () => {
        setIsConnecting(true);
        authenticate({
            onFinish: (payload) => {
                // Use the session from payload as it's guaranteed to be fresh
                const session = payload.userSession || userSession;
                syncState(session);

                // Redirect to dashboard if successful
                if (session && session.isUserSignedIn()) {
                    router.push('/seller');
                }
                setIsConnecting(false);
            },
            onCancel: () => {
                setIsConnecting(false);
            },
            appDetails: {
                name: 'stxact',
                icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.png' : '/favicon.png',
            },
        });
    };

    const disconnect = () => {
        if (userSession) {
            userSession.signUserOut();
        }
        syncState();
        setIsConnecting(false);
    };

    const value = {
        address,
        userData,
        balance,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<UserSession | undefined>(undefined);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setSession(getSession());
    }, []);

    if (!mounted || !session) return <>{children}</>;

    const authOptions = {
        appDetails: {
            name: 'stxact',
            icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.png' : '/favicon.png',
        },
        userSession: session,
    };

    return (
        <Connect authOptions={authOptions}>
            <WalletStateProvider>
                {children}
            </WalletStateProvider>
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
            connect: () => { },
            disconnect: () => { },
        };
    }
    return context;
}
