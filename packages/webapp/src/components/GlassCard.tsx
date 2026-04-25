import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle';
  hover?: boolean;
}

const variantClasses = {
  default: 'glass',
  strong: 'glass-strong',
  subtle: 'glass-subtle',
} as const;

export function GlassCard({ children, className, variant = 'default', hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-none',
        variantClasses[variant],
        hover && 'transition-all duration-200 hover:glass-elevate',
        className
      )}
    >
      {children}
    </div>
  );
}

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('glass-strong min-w-0 rounded-none p-6', className)}>
      {children}
    </div>
  );
}

export function GlassTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('glass rounded-none overflow-hidden', className)}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}


/**
 * Constrained string union governing absolute opacity values in glassmorphism cards.
 */
export type GlassOpacity = 'light' | 'medium' | 'heavy';
