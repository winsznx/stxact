import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface StackProps {
  children: ReactNode;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const gapClasses = { xs: 'space-y-1', sm: 'space-y-2', md: 'space-y-4', lg: 'space-y-6' } as const;

export function Stack({ children, gap = 'md', className }: StackProps) {
  return <div className={cn(gapClasses[gap], className)}>{children}</div>;
}
