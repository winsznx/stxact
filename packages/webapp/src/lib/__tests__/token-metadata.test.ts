import { describe, it, expect, beforeEach } from 'vitest';
import { getSbtcMetadata } from '../token-metadata';
import { resetNetworkCache } from '../network';

describe('token-metadata', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns mainnet sBTC metadata', () => {
    const m = getSbtcMetadata('mainnet');
    expect(m.symbol).toBe('sBTC');
    expect(m.decimals).toBe(8);
    expect(m.contractId).toContain('SM3VDXK3WZZSA84');
  });

  it('returns testnet sBTC metadata', () => {
    const m = getSbtcMetadata('testnet');
    expect(m.contractId).toContain('ST1F7QA2MDF17S807');
  });

  it('falls back to current network', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getSbtcMetadata().network).toBe('mainnet');
  });
});
