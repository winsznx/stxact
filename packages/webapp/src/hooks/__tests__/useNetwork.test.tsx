import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetwork } from '../useNetwork';
import { resetNetworkCache } from '@/lib/network';

describe('useNetwork', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns testnet by default', () => {
    const { result } = renderHook(() => useNetwork());
    expect(result.current).toBe('testnet');
  });

  it('returns mainnet when env set', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    const { result } = renderHook(() => useNetwork());
    expect(result.current).toBe('mainnet');
  });
});
