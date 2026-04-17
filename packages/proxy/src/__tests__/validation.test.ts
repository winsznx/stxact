import { isUuid, isStacksPrincipal, isHex64, clampPagination } from '../utils/validation';

describe('isUuid', () => {
  it('accepts valid UUIDs', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('isStacksPrincipal', () => {
  it('accepts testnet principals', () => {
    expect(isStacksPrincipal('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toBe(true);
  });

  it('rejects invalid principals', () => {
    expect(isStacksPrincipal('0xabc')).toBe(false);
  });
});

describe('isHex64', () => {
  it('accepts 64-char hex strings', () => {
    expect(isHex64('a'.repeat(64))).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isHex64('abc')).toBe(false);
  });
});

describe('clampPagination', () => {
  it('returns defaults for undefined input', () => {
    expect(clampPagination(undefined, undefined)).toEqual({ limit: 50, offset: 0 });
  });

  it('clamps limit to max', () => {
    expect(clampPagination('999', '0')).toEqual({ limit: 200, offset: 0 });
  });

  it('prevents negative offset', () => {
    expect(clampPagination('10', '-5')).toEqual({ limit: 10, offset: 0 });
  });
});
