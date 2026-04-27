import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeTxId, getCurrentNetwork, getTransactionExplorerUrl } from '../wallet-transactions';
import { resetNetworkCache } from '../network';

describe('wallet-transactions', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('normalizeTxId adds 0x when missing', () => {
    expect(normalizeTxId('abc')).toBe('0xabc');
  });

  it('normalizeTxId preserves existing 0x', () => {
    expect(normalizeTxId('0xabc')).toBe('0xabc');
  });

  it('getCurrentNetwork reflects env', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getCurrentNetwork()).toBe('mainnet');
  });

  it('getTransactionExplorerUrl includes chain query', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(getTransactionExplorerUrl('abc123')).toContain('chain=testnet');
  });
});
