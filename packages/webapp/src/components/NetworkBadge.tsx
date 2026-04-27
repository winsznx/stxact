'use client';

import { cn } from '@/lib/cn';
import { getNetwork } from '@/lib/network';
import { useHydrated } from '@/hooks/useHydrated';

interface NetworkBadgeProps {
  className?: string;
}

export function NetworkBadge({ className }: NetworkBadgeProps) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const network = getNetwork();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        network === 'mainnet'
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-warning/40 bg-warning/10 text-warning',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5', network === 'mainnet' ? 'bg-success' : 'bg-warning')} />
      {network}
    </span>
  );
}
