import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function InfoRow({ label, children, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border py-3 last:border-b-0', className)}>
      <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
        {label}
      </span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}


/**
 * Structural flexbox alignment bindings strictly scoped to info row items.
 */
export type InfoRowAlignment = 'start' | 'center' | 'end';
