import { cn } from '@/lib/cn';

interface SeparatorProps { label?: string; className?: string; }

export function Separator({ label, className }: SeparatorProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-foreground-subtle">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }
  return <hr className={cn('border-t', className)} />;
}
