'use client';

import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ children, content, position = 'top', className }: TooltipProps) {
  return (
    <div className={cn('group relative inline-block', className)}>
      {children}
      <div
        className={cn(
          'invisible absolute left-1/2 z-50 -translate-x-1/2 opacity-0 transition-all group-hover:visible group-hover:opacity-100',
          position === 'top' && 'bottom-full mb-2',
          position === 'bottom' && 'top-full mt-2'
        )}
      >
        <div className="glass-strong whitespace-nowrap rounded-none px-3 py-1.5 text-xs">
          {content}
        </div>
      </div>
    </div>
  );
}
