import { cn } from '@/lib/cn';

type Status = 'online' | 'offline' | 'pending' | 'error';

interface StatusDotProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusColors: Record<Status, string> = {
  online: 'bg-success',
  offline: 'bg-foreground-subtle',
  pending: 'bg-warning',
  error: 'bg-error',
};

export function StatusDot({ status, label, className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-block h-2 w-2 shrink-0',
          statusColors[status],
          status === 'pending' && 'animate-pulse'
        )}
      />
      {label && <span className="text-xs text-foreground-muted">{label}</span>}
    </span>
  );
}
