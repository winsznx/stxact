import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricTileProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricTile({ label, value, change, icon: Icon, trend, className }: MetricTileProps) {
  return (
    <div className={clsx('glass rounded-none p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground-muted">{label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>

          {change && (
            <p className="mt-1 text-xs text-foreground-subtle">
              <span
                className={clsx(
                  'font-medium',
                  trend === 'up' && 'text-success',
                  trend === 'down' && 'text-error',
                  trend === 'neutral' && 'text-foreground-muted'
                )}
              >
                {change.value > 0 ? '+' : ''}
                {change.value}%
              </span>
              {' '}
              {change.period}
            </p>
          )}
        </div>

        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-none border border bg-background">
            <Icon className="h-5 w-5 text-foreground-muted" />
          </div>
        )}
      </div>
    </div>
  );
}
