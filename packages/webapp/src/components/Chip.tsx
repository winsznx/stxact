import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface ChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function Chip({ label, onRemove, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-none border border bg-background-raised px-2 py-0.5 text-xs font-medium text-foreground-muted',
        className
      )}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-foreground" aria-label={`Remove ${label}`}>
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}


/**
 * Boolean constraint map dictating Chip border and radius rendering.
 */
export interface ChipStyleOptions { readonly rounded?: boolean; readonly outlined?: boolean; }
