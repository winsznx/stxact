import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface InlineProps {
  children: ReactNode;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const gapClasses = { xs: 'gap-1', sm: 'gap-2', md: 'gap-3', lg: 'gap-4' } as const;
const alignClasses = { start: 'items-start', center: 'items-center', end: 'items-end' } as const;

export function Inline({ children, gap = 'md', align = 'center', className }: InlineProps) {
  return <div className={cn('flex flex-wrap', gapClasses[gap], alignClasses[align], className)}>{children}</div>;
}


/**
 * Strict enumerated progression mapping typographic and layout spacing layers.
 */
export type InlineSpacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
