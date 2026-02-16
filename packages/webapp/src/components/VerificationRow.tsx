import { CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

type VerificationStatus = 'verified' | 'failed' | 'pending';

interface VerificationRowProps {
  label: string;
  status: VerificationStatus;
  details?: string;
  expandable?: boolean;
}

const statusConfig = {
  verified: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  failed: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
  },
  pending: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
};

export function VerificationRow({ label, status, details, expandable = true }: VerificationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="border-b border last:border-b-0">
      <button
        onClick={() => expandable && details && setExpanded(!expanded)}
        className={clsx(
          'flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
          expandable && details && 'hover:bg-background-raised/50',
          !expandable || !details ? 'cursor-default' : 'cursor-pointer'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full', config.bg)}>
            <Icon className={clsx('h-4 w-4', config.color)} />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>

        {expandable && details && (
          <ChevronDown
            className={clsx(
              'h-4 w-4 text-foreground-subtle transition-transform',
              expanded && 'rotate-180'
            )}
          />
        )}
      </button>

      {expanded && details && (
        <div className="animate-fade-in border-t border bg-background-raised/30 px-4 py-3">
          <p className="text-xs text-foreground-muted">{details}</p>
        </div>
      )}
    </div>
  );
}
