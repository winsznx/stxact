import { describe, it, expect } from 'vitest';
import { queryKeys } from '../query-keys';

describe('queryKeys factory', () => {
  it('produces consistent service detail key', () => {
    const k1 = queryKeys.services.detail('SP1');
    const k2 = queryKeys.services.detail('SP1');
    expect(k1).toEqual(k2);
  });

  it('differs by principal', () => {
    expect(queryKeys.services.detail('SP1')).not.toEqual(queryKeys.services.detail('SP2'));
  });

  it('list key includes params', () => {
    const k = queryKeys.services.list({ category: 'data-api' });
    expect(k[0]).toBe('services');
    expect(k[1]).toEqual({ category: 'data-api' });
  });

  it('reputation key uses principal', () => {
    expect(queryKeys.reputation.detail('SP1')).toEqual(['reputation', 'SP1']);
  });
});
