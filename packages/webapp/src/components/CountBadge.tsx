import { cn } from '@/lib/cn';

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[10px] font-bold text-accent-contrast', className)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
