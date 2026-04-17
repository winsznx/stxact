import { describe, it, expect } from 'vitest';
import { queryKeys } from '../query-keys';

describe('queryKeys', () => {
  it('generates consistent service keys', () => {
    expect(queryKeys.services.all).toEqual(['services']);
    expect(queryKeys.services.detail('SP123')).toEqual(['service', 'SP123']);
  });

  it('generates consistent receipt keys', () => {
    expect(queryKeys.receipts.all).toEqual(['receipts']);
    expect(queryKeys.receipts.detail('abc')).toEqual(['receipt', 'abc']);
  });

  it('includes params in list keys', () => {
    const key = queryKeys.disputes.list({ status: 'open' });
    expect(key).toEqual(['disputes', { status: 'open' }]);
  });

  it('generates reputation keys', () => {
    expect(queryKeys.reputation.detail('SP123')).toEqual(['reputation', 'SP123']);
  });
});
