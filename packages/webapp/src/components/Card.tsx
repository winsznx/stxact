import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div className={cn('rounded-none border border bg-background-raised', paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-b border pb-4', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border pt-4', className)}>
      {children}
    </div>
  );
}


/**
 * Structural map binding composite Card rendering elements.
 */
export interface CardSubcomponents { readonly Header: React.FC<any>; readonly Body: React.FC<any>; readonly Footer: React.FC<any>; }
