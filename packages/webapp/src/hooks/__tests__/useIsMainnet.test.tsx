import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMainnet } from '../useIsMainnet';
import { resetNetworkCache } from '@/lib/network';

describe('useIsMainnet', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns false on testnet', () => {
    const { result } = renderHook(() => useIsMainnet());
    expect(result.current).toBe(false);
  });

  it('returns true on mainnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    const { result } = renderHook(() => useIsMainnet());
    expect(result.current).toBe(true);
  });
});
