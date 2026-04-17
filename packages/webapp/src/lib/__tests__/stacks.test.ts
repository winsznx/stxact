import { describe, it, expect } from 'vitest';
import { isValidStacksAddress, getTransactionUrl, getAddressUrl } from '../stacks';

describe('isValidStacksAddress', () => {
  it('accepts valid testnet address', () => {
    expect(isValidStacksAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toBe(true);
  });

  it('accepts valid mainnet address', () => {
    expect(isValidStacksAddress('SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBPQA1')).toBe(false);
  });

  it('rejects invalid addresses', () => {
    expect(isValidStacksAddress('0x123')).toBe(false);
    expect(isValidStacksAddress('')).toBe(false);
  });
});

describe('getTransactionUrl', () => {
  it('generates testnet URL', () => {
    const url = getTransactionUrl('abc123', 'testnet');
    expect(url).toContain('chain=testnet');
    expect(url).toContain('0xabc123');
  });

  it('normalizes tx ID with 0x prefix', () => {
    const url = getTransactionUrl('0xabc123');
    expect(url).toContain('0xabc123');
    expect(url).not.toContain('0x0x');
  });
});

describe('getAddressUrl', () => {
  it('generates correct explorer URL', () => {
    const url = getAddressUrl('ST1ABC', 'testnet');
    expect(url).toContain('/address/ST1ABC');
  });
});
