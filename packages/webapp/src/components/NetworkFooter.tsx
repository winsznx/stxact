'use client';

import { cn } from '@/lib/cn';
import { getNetwork } from '@/lib/network';
import { useHydrated } from '@/hooks/useHydrated';

interface NetworkFooterProps {
  className?: string;
}

export function NetworkFooter({ className }: NetworkFooterProps) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const network = getNetwork();
  return (
    <div className={cn('text-xs text-foreground-subtle', className)}>
      Network: <span className="font-mono">{network}</span>
    </div>
  );
}
