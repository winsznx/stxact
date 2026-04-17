import { cn } from '@/lib/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground-muted">{label}</span>
          <span className="text-xs font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-background-raised">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
