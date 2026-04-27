import { describe, it, expect } from 'vitest';
import { resetNetworkCache, getNetwork } from '../network';

describe('network cache', () => {
  it('returns same value when env unchanged', () => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
    const first = getNetwork();
    const second = getNetwork();
    expect(first).toBe(second);
  });

  it('reflects env change after resetNetworkCache', () => {
    resetNetworkCache();
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    expect(getNetwork()).toBe('testnet');
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getNetwork()).toBe('mainnet');
  });

  it('does not reflect env change without reset', () => {
    resetNetworkCache();
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    expect(getNetwork()).toBe('testnet');
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    expect(getNetwork()).toBe('testnet');
  });
});
