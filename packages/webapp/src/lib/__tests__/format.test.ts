import { describe, it, expect } from 'vitest';
import { truncateAddress, formatMicroStx } from '../format';

describe('truncateAddress', () => {
  it('truncates long addresses', () => {
    const addr = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    expect(truncateAddress(addr)).toBe('ST1PQH...PGZGM');
  });

  it('returns short addresses as-is', () => {
    expect(truncateAddress('ABCDEFGH', 6, 4)).toBe('ABCDEFGH');
  });
});

describe('formatMicroStx', () => {
  it('formats numeric values', () => {
    expect(formatMicroStx(1000000)).toBe('1.00 STX');
  });

  it('formats string values', () => {
    expect(formatMicroStx('500000')).toBe('0.50 STX');
  });

  it('handles NaN gracefully', () => {
    expect(formatMicroStx('not-a-number')).toBe('0 STX');
  });
});
