'use client';

import { cn } from '@/lib/cn';
import { truncateAddress } from '@/lib/format';
import { CopyButton } from './CopyButton';

interface AddressDisplayProps {
  address: string;
  startChars?: number;
  endChars?: number;
  copyable?: boolean;
  className?: string;
}

export function AddressDisplay({
  address,
  startChars = 6,
  endChars = 4,
  copyable = true,
  className,
}: AddressDisplayProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-sm" title={address}>
        {truncateAddress(address, startChars, endChars)}
      </span>
      {copyable && <CopyButton value={address} />}
    </span>
  );
}
