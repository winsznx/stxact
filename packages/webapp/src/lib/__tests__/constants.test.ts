import { describe, it, expect } from 'vitest';
import {
  QUERY_STALE_TIMES,
  DISPUTE_STATUSES,
  PAGINATION_DEFAULTS,
  STACKS_EXPLORER_BASE,
  SERVICE_CATEGORIES,
} from '../constants';

describe('constants', () => {
  it('exports query stale times for each domain', () => {
    expect(QUERY_STALE_TIMES.services).toBeGreaterThan(0);
    expect(QUERY_STALE_TIMES.receipts).toBeGreaterThan(0);
    expect(QUERY_STALE_TIMES.disputes).toBeGreaterThan(0);
    expect(QUERY_STALE_TIMES.reputation).toBeGreaterThan(0);
  });

  it('exports the canonical dispute statuses', () => {
    expect(DISPUTE_STATUSES).toContain('open');
    expect(DISPUTE_STATUSES).toContain('refunded');
    expect(DISPUTE_STATUSES).toContain('rejected');
  });

  it('exports pagination defaults', () => {
    expect(PAGINATION_DEFAULTS.limit).toBeGreaterThan(0);
    expect(PAGINATION_DEFAULTS.offset).toBe(0);
  });

  it('uses Hiro explorer host', () => {
    expect(STACKS_EXPLORER_BASE).toBe('https://explorer.hiro.so');
  });

  it('exports the service categories', () => {
    expect(SERVICE_CATEGORIES).toContain('data-api');
    expect(SERVICE_CATEGORIES).toContain('ai-compute');
  });
});
