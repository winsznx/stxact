import {
  buildCacheKey,
  buildBnsCacheKey,
  buildReceiptCacheKey,
  buildReputationCacheKey,
} from '../../src/storage/keyspace';

describe('keyspace', () => {
  it('joins parts with colon', () => {
    expect(buildCacheKey('a', 'b', 1)).toBe('a:b:1');
  });

  it('lowercases BNS name', () => {
    expect(buildBnsCacheKey('YIELD-API.BTC')).toBe('bns:yield-api.btc');
  });

  it('builds receipt cache key', () => {
    expect(buildReceiptCacheKey('abc123')).toBe('receipt:abc123');
  });

  it('builds reputation cache key', () => {
    expect(buildReputationCacheKey('SP1')).toBe('reputation:SP1');
  });
});
