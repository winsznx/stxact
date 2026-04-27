'use client';

import { useNetwork } from '@/hooks/useNetwork';

export function useIsMainnet(): boolean {
  return useNetwork() === 'mainnet';
}
