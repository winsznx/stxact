'use client';

import { cn } from '@/lib/cn';
import { formatRelativeTime, formatTimestamp } from '@/lib/format';
import { useCurrentEpochSeconds } from '@/hooks/useCurrentEpochSeconds';

interface RelativeTimeProps {
  timestamp: number;
  className?: string;
}

export function RelativeTime({ timestamp, className }: RelativeTimeProps) {
  useCurrentEpochSeconds();

  return (
    <time
      dateTime={new Date(timestamp * 1000).toISOString()}
      title={formatTimestamp(timestamp)}
      className={cn('text-foreground-muted', className)}
    >
      {formatRelativeTime(timestamp)}
    </time>
  );
}
