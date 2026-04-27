import { describe, it, expect, beforeEach } from 'vitest';
import { getDisplayConfirmationDepth, getConfirmationLabel } from '../confirmation-depth';
import { resetNetworkCache } from '../network';

describe('confirmation-depth (webapp)', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns 6 for mainnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getDisplayConfirmationDepth()).toBe(6);
  });

  it('returns 1 for testnet', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(getDisplayConfirmationDepth()).toBe(1);
  });

  it('uses singular label for 1 confirmation', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(getConfirmationLabel()).toBe('1 confirmation');
  });

  it('uses plural label for >1 confirmations', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getConfirmationLabel()).toBe('6 confirmations');
  });
});
