import { describe, it, expect } from 'vitest';
import { DISPUTE_STATUSES, QUERY_STALE_TIMES, PAGINATION_DEFAULTS } from '../constants';

describe('constants', () => {
  it('defines all dispute statuses', () => {
    expect(DISPUTE_STATUSES).toContain('open');
    expect(DISPUTE_STATUSES).toContain('resolved');
    expect(DISPUTE_STATUSES).toContain('refunded');
    expect(DISPUTE_STATUSES.length).toBe(5);
  });

  it('has positive stale times', () => {
    expect(QUERY_STALE_TIMES.services).toBeGreaterThan(0);
    expect(QUERY_STALE_TIMES.receipts).toBeGreaterThan(0);
    expect(QUERY_STALE_TIMES.disputes).toBeGreaterThan(0);
  });

  it('has valid pagination defaults', () => {
    expect(PAGINATION_DEFAULTS.limit).toBeGreaterThan(0);
    expect(PAGINATION_DEFAULTS.offset).toBe(0);
  });
});
