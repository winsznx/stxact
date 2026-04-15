import { cn } from '@/lib/cn';

interface DividerProps {
  className?: string;
  variant?: 'solid' | 'dashed' | 'receipt';
}

export function Divider({ className, variant = 'solid' }: DividerProps) {
  if (variant === 'receipt') {
    return (
      <div
        className={cn('my-4 h-px w-full', className)}
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--border-strong) 0, var(--border-strong) 4px, transparent 4px, transparent 8px)',
        }}
      />
    );
  }

  return (
    <hr
      className={cn(
        'my-4 border-t',
        variant === 'dashed' && 'border-dashed',
        className
      )}
    />
  );
}
