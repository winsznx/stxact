import { getNetworkId, isMainnet, resetNetworkCache } from '../../src/config/network';

describe('network edge cases', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    delete process.env.NODE_ENV;
  });

  it('treats empty STACKS_NETWORK as unset', () => {
    process.env.STACKS_NETWORK = '';
    process.env.NODE_ENV = 'test';
    expect(getNetworkId()).toBe('testnet');
  });

  it('rejects mixed case STACKS_NETWORK', () => {
    process.env.STACKS_NETWORK = 'MainNet';
    process.env.NODE_ENV = 'test';
    expect(() => getNetworkId()).toThrow(/Invalid/);
  });

  it('accepts mocknet', () => {
    process.env.STACKS_NETWORK = 'mocknet';
    process.env.NODE_ENV = 'test';
    expect(getNetworkId()).toBe('mocknet');
    expect(isMainnet()).toBe(false);
  });
});
