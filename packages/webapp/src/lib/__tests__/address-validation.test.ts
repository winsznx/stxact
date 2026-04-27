import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateAddressForActiveNetwork,
  AddressNetworkMismatch,
  stacksAddressForCurrentNetwork,
} from '../address-validation';
import { resetNetworkCache } from '../network';

describe('address-validation', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('throws AddressNetworkMismatch for testnet address on mainnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(() => validateAddressForActiveNetwork('ST1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')).toThrow(
      AddressNetworkMismatch
    );
  });

  it('accepts mainnet address on mainnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(() =>
      validateAddressForActiveNetwork('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0')
    ).not.toThrow();
  });

  it('zod schema rejects mainnet address on testnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    const result = stacksAddressForCurrentNetwork.safeParse('SP1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0');
    expect(result.success).toBe(false);
  });

  it('zod schema accepts testnet address on testnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    const result = stacksAddressForCurrentNetwork.safeParse('ST1FP8AYH4PJ3R3RD6AP0ZN9T9VBP0GE6MSVPZ3Q0');
    expect(result.success).toBe(true);
  });
});
