import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface KbdProps {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center border border-strong bg-background-raised px-1.5 font-mono text-[10px] font-medium text-foreground-muted',
        className
      )}
    >
      {children}
    </kbd>
  );
}
