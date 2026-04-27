import { getX402ChainId } from '../../src/utils/x402-chain';
import { resetNetworkCache } from '../../src/config/network';

describe('x402-chain', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns stacks:1 for mainnet', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getX402ChainId()).toBe('stacks:1');
  });

  it('returns stacks:2147483648 for testnet', () => {
    process.env.STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(getX402ChainId()).toBe('stacks:2147483648');
  });

  it('treats mocknet as testnet for chain id', () => {
    process.env.STACKS_NETWORK = 'mocknet';
    resetNetworkCache();
    expect(getX402ChainId()).toBe('stacks:2147483648');
  });
});
