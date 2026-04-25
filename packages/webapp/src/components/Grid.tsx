import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface GridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
} as const;

const gapClasses = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' } as const;

export function Grid({ children, cols = 3, gap = 'md', className }: GridProps) {
  return <div className={cn('grid', colClasses[cols], gapClasses[gap], className)}>{children}</div>;
}


/**
 * Readonly dictionary explicitly representing grid span rules for responsive UI bounds.
 */
export interface GridSpanOptions { readonly sm?: number; readonly md?: number; readonly lg?: number; }
