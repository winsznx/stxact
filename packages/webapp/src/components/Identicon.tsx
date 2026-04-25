import { cn } from '@/lib/cn';

interface IdenticonProps {
  address: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[8px]',
  md: 'h-8 w-8 text-[10px]',
  lg: 'h-10 w-10 text-xs',
} as const;

function hashToColor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

export function Identicon({ address, size = 'md', className }: IdenticonProps) {
  const color = hashToColor(address);
  const initials = address.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-none border font-mono font-bold text-white',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color }}
      title={address}
    >
      {initials}
    </div>
  );
}


/**
 * Strictly typed aesthetic layer configuration for hashed identicon generation.
 */
export interface IdenticonTheme { readonly background?: string; readonly foreground?: string; }
