import { describe, it, expect, beforeEach } from 'vitest';
import { getNetwork, isMainnet, isTestnet, getStacksApiUrl, resetNetworkCache } from '../network';

describe('network', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    delete process.env.NEXT_PUBLIC_STACKS_API_URL;
    process.env.NODE_ENV = 'test';
  });

  it('returns testnet when env unset in non-production', () => {
    expect(getNetwork()).toBe('testnet');
  });

  it('throws in production when env unset', () => {
    process.env.NODE_ENV = 'production';
    resetNetworkCache();
    expect(() => getNetwork()).toThrow(/required in production/);
  });

  it('parses mainnet env', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getNetwork()).toBe('mainnet');
    expect(isMainnet()).toBe(true);
    expect(isTestnet()).toBe(false);
  });

  it('throws on invalid network', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'wonderland';
    resetNetworkCache();
    expect(() => getNetwork()).toThrow(/Invalid/);
  });

  it('returns hiro mainnet URL when network is mainnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getStacksApiUrl()).toBe('https://api.mainnet.hiro.so');
  });

  it('returns hiro testnet URL by default', () => {
    expect(getStacksApiUrl()).toBe('https://api.testnet.hiro.so');
  });

  it('honors explicit NEXT_PUBLIC_STACKS_API_URL override', () => {
    process.env.NEXT_PUBLIC_STACKS_API_URL = 'https://custom.example.com';
    resetNetworkCache();
    expect(getStacksApiUrl()).toBe('https://custom.example.com');
  });
});
