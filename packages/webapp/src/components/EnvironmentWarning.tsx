'use client';

import { AlertTriangle } from 'lucide-react';
import { useHydrated } from '@/hooks/useHydrated';
import { isTestnet } from '@/lib/network';

export function EnvironmentWarning() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  if (!isTestnet()) return null;

  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs text-warning">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          You are interacting with the Stacks testnet. No real value is at stake; receipts and disputes are illustrative.
        </span>
      </div>
    </div>
  );
}
