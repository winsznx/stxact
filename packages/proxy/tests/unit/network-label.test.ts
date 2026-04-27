import { networkLabel, resetNetworkCache } from '../../src/config/network';

describe('networkLabel', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns MAINNET for mainnet', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(networkLabel()).toBe('MAINNET');
  });

  it('returns TESTNET for testnet', () => {
    process.env.STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(networkLabel()).toBe('TESTNET');
  });
});
