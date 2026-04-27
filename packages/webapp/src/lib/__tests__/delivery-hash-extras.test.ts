import { describe, it, expect } from 'vitest';
import { computeDeliveryHash } from '../delivery-hash';

describe('computeDeliveryHash extras', () => {
  it('returns 64 hex characters', async () => {
    const out = await computeDeliveryHash('payload');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns identical hash for identical input', async () => {
    const a = await computeDeliveryHash('hello');
    const b = await computeDeliveryHash('hello');
    expect(a).toBe(b);
  });

  it('returns different hash for different input', async () => {
    const a = await computeDeliveryHash('a');
    const b = await computeDeliveryHash('b');
    expect(a).not.toBe(b);
  });
});
