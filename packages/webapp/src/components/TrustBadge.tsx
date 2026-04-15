import { Shield, Database, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

type TrustLevel = 'anchored' | 'database' | 'risk';

interface TrustBadgeProps {
  level: TrustLevel;
  className?: string;
}

const badgeConfig = {
  anchored: {
    label: 'Anchored',
    subtitle: 'Institutional-grade',
    icon: Shield,
    classes: 'border-success bg-success/10 text-success',
  },
  database: {
    label: 'DB-only',
    subtitle: 'Database-backed',
    icon: Database,
    classes: 'border-warning bg-warning/10 text-warning',
  },
  risk: {
    label: 'Risk',
    subtitle: 'Low stake / high disputes',
    icon: AlertTriangle,
    classes: 'border-error bg-error/10 text-error',
  },
} as const;

export function TrustBadge({ level, className }: TrustBadgeProps) {
  const config = badgeConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs font-semibold',
        config.classes,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
}

export function TrustBadgeWithTooltip({ level, className }: TrustBadgeProps) {
  const config = badgeConfig[level];
  const Icon = config.icon;

  return (
    <div className="group relative inline-block">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs font-semibold',
          config.classes,
          className
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>

      <div className="invisible absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <div className="glass-strong whitespace-nowrap rounded-none px-3 py-2 text-xs">
          {config.subtitle}
        </div>
      </div>
    </div>
  );
}
