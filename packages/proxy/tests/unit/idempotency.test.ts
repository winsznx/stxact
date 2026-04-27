import {
  generateIdempotencyKey,
  hashIdempotencyKey,
  isValidIdempotencyKey,
} from '../../src/utils/idempotency';

describe('idempotency', () => {
  it('generates 32-character hex keys', () => {
    expect(generateIdempotencyKey()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates unique keys', () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).not.toBe(b);
  });

  it('hashes deterministically', () => {
    const key = 'test-key';
    expect(hashIdempotencyKey(key)).toBe(hashIdempotencyKey(key));
  });

  it('hash output is 64 hex chars', () => {
    expect(hashIdempotencyKey('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts valid keys', () => {
    expect(isValidIdempotencyKey('abc12345')).toBe(true);
    expect(isValidIdempotencyKey('abc-123_def')).toBe(true);
  });

  it('rejects too-short keys', () => {
    expect(isValidIdempotencyKey('short')).toBe(false);
  });

  it('rejects too-long keys', () => {
    expect(isValidIdempotencyKey('a'.repeat(200))).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(isValidIdempotencyKey('contains spaces')).toBe(false);
    expect(isValidIdempotencyKey('contains/slash')).toBe(false);
  });
});
