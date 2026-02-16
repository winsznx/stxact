'use client';

import { useState } from 'react';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowMenu(false);
  };

  if (!isConnected || !address) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 rounded-none border border bg-accent px-4 py-2 font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 rounded-none border border bg-background-raised px-4 py-2 transition-colors hover:border-accent hover:bg-background-overlay"
      >
        <div className="h-2 w-2 bg-accent" />
        <span className="font-mono text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 z-50 mt-2 w-64 animate-fade-in rounded-none border border bg-background-overlay p-2 shadow-lg glass-strong">
          <div className="border-b border px-3 py-2">
            <div className="mb-1 text-xs text-foreground-subtle">Connected</div>
            <div className="break-all font-mono text-xs text-foreground">
              {address}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors hover:bg-background-raised"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Address
              </>
            )}
          </button>

          <button
            onClick={handleDisconnect}
            className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm text-error transition-colors hover:bg-background-raised"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}

      {/* Overlay to close menu on click outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
