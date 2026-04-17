import { cn } from '@/lib/cn';
import { formatMicroStx } from '@/lib/format';

interface StxAmountProps {
  microStx: string | number;
  className?: string;
  showSymbol?: boolean;
}

export function StxAmount({ microStx, className, showSymbol = true }: StxAmountProps) {
  const formatted = formatMicroStx(microStx);
  const display = showSymbol ? formatted : formatted.replace(' STX', '');

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {display}
    </span>
  );
}
