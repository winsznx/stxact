import { describe, it, expect, beforeEach } from 'vitest';
import { getNetwork, isMainnet, isTestnet, resetNetworkCache } from '../network';

describe('network type narrowing', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('isMainnet narrows correctly', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    if (isMainnet()) {
      expect(getNetwork()).toBe('mainnet');
    }
  });

  it('isTestnet narrows correctly', () => {
    if (isTestnet()) {
      expect(getNetwork()).toBe('testnet');
    }
  });

  it('exactly one of isMainnet/isTestnet is true', () => {
    expect(isMainnet() !== isTestnet()).toBe(true);
  });
});
