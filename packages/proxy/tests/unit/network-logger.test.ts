import { withNetworkContext } from '../../src/config/network-logger';
import { resetNetworkCache } from '../../src/config/network';

describe('network-logger', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('adds network field to payload', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    const tagged = withNetworkContext({ event: 'test' });
    expect(tagged.network).toBe('mainnet');
    expect(tagged.event).toBe('test');
  });

  it('preserves existing fields', () => {
    const tagged = withNetworkContext({ a: 1, b: 'x' });
    expect(tagged.a).toBe(1);
    expect(tagged.b).toBe('x');
  });
});
