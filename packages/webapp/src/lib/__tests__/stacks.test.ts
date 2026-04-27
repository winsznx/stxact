import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTransactionUrl,
  getAddressUrl,
  isValidStacksAddress,
  isMainnetAddress,
  isTestnetAddress,
  isAddressOnNetwork,
  getContractId,
} from '../stacks';
import { resetNetworkCache } from '../network';

describe('stacks helpers', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('builds explorer transaction URL with 0x prefix when missing', () => {
    expect(getTransactionUrl('abc123', 'mainnet')).toBe(
      'https://explorer.hiro.so/txid/0xabc123?chain=mainnet'
    );
  });

  it('preserves existing 0x prefix on transaction URL', () => {
    expect(getTransactionUrl('0xdeadbeef', 'mainnet')).toBe(
      'https://explorer.hiro.so/txid/0xdeadbeef?chain=mainnet'
    );
  });

  it('falls back to current network when not specified', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getTransactionUrl('0xabc')).toContain('chain=mainnet');
  });

  it('builds address URL with chain query', () => {
    expect(getAddressUrl('SP123ABC', 'testnet')).toBe(
      'https://explorer.hiro.so/address/SP123ABC?chain=testnet'
    );
  });

  it('isMainnetAddress rejects testnet prefixes', () => {
    expect(isMainnetAddress('ST1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(false);
    expect(isMainnetAddress('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(true);
  });

  it('isTestnetAddress rejects mainnet prefixes', () => {
    expect(isTestnetAddress('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(false);
    expect(isTestnetAddress('ST1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(true);
  });

  it('isAddressOnNetwork validates contextually', () => {
    expect(isAddressOnNetwork('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0', 'mainnet')).toBe(true);
    expect(isAddressOnNetwork('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0', 'testnet')).toBe(false);
  });

  it('isValidStacksAddress accepts both networks', () => {
    expect(isValidStacksAddress('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(true);
    expect(isValidStacksAddress('ST1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toBe(true);
    expect(isValidStacksAddress('not-an-address')).toBe(false);
  });

  it('getContractId joins address and contract name', () => {
    expect(getContractId('SP1ABC', 'service-registry')).toBe('SP1ABC.service-registry');
  });
});
