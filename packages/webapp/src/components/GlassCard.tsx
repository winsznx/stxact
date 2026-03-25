import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle';
  hover?: boolean;
}

export function GlassCard({ children, className, variant = 'default', hover = false }: GlassCardProps) {
  const variantClasses = {
    default: 'glass',
    strong: 'glass-strong',
    subtle: 'glass-subtle',
  };

  return (
    <div
      className={clsx(
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

/**
 * Executes logic associated with glass panel.
 */
export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('glass-strong min-w-0 rounded-none p-6', className)}>
      {children}
    </div>
  );
}

/**
 * Executes logic associated with glass table.
 */
export function GlassTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('glass rounded-none overflow-hidden', className)}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
