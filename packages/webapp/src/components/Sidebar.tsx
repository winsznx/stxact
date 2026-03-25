'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Wallet,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useWallet } from '@/hooks/useWallet';
import { appNavigation } from '@/lib/navigation';

/**
 * Executes logic associated with sidebar.
 */
export function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();
    const { address, balance, disconnect } = useWallet();

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const activeHref = useMemo(() => {
        if (!pathname) return '';
        const sortedLinks = [...appNavigation].sort((a, b) => b.href.length - a.href.length);
        const match = sortedLinks.find(
            ({ href }) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
        );
        return match?.href || '';
    }, [pathname]);

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatBalance = (bal: string) => {
        const stx = parseFloat(bal) / 1_000_000;
        return stx.toFixed(2);
    };

    return (
        <>
            {/* Sidebar */}
            <aside
                className={`
          fixed left-0 top-0 z-40 hidden h-screen lg:block
          glass-strong border-r border-strong
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64' : 'w-20'}
        `}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex h-16 items-center justify-between border-b border px-4">
                        <Link href="/" aria-label="stxact home">
                            <BrandLogo
                                showLabel={isOpen}
                                iconClassName="h-10 w-10"
                                labelClassName="text-lg font-bold"
                            />
                        </Link>
                        <button
                            onClick={toggleSidebar}
                            className="hidden rounded-none p-1.5 hover:bg-background-overlay lg:block"
                            aria-label="Toggle sidebar"
                        >
                            {isOpen ? (
                                <ChevronLeft className="h-5 w-5" />
                            ) : (
                                <ChevronRight className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                        {appNavigation.map((item) => {
                            const Icon = item.icon;
                            const active = activeHref === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                    flex items-center gap-3 rounded-none px-3 py-2.5
                    transition-all duration-200
                    ${active
                                            ? 'bg-accent text-accent-contrast border-l-2 border-accent'
                                            : 'hover:bg-background-overlay hover:border-l-2 hover:border-accent/50'
                                        }
                    ${!isOpen && 'justify-center'}
                  `}
                                >
                                    <Icon className={`h-5 w-5 ${active ? 'text-accent-contrast' : ''}`} />
                                    {isOpen && (
                                        <span className={`font-medium ${active ? 'text-accent-contrast' : ''}`}>
                                            {item.name}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Wallet Info */}
                    {address && (
                        <div className="border-t border p-4">
                            {isOpen ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-accent" />
                                        <span className="text-xs font-medium text-foreground-muted">
                                            Connected
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-mono text-xs text-foreground-subtle">
                                            {formatAddress(address)}
                                        </p>
                                        {balance && (
                                            <p className="font-mono text-sm font-semibold">
                                                {formatBalance(balance)} STX
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={disconnect}
                                        className="flex w-full items-center justify-center gap-2 rounded-none border border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-background-overlay"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Wallet className="h-5 w-5 text-accent" />
                                    <button
                                        onClick={disconnect}
                                        className="rounded-none p-1.5 hover:bg-background-overlay"
                                        aria-label="Disconnect wallet"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Spacer for main content */}
            <div
                className={`
          hidden lg:block
          transition-all duration-300
          ${isOpen ? 'w-64' : 'w-20'}
        `}
            />
        </>
    );
}
