import { randomBytes, createHash } from 'crypto';

const IDEMPOTENCY_KEY_LENGTH_BYTES = 16;

export function generateIdempotencyKey(): string {
  return randomBytes(IDEMPOTENCY_KEY_LENGTH_BYTES).toString('hex');
}

export function hashIdempotencyKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function isValidIdempotencyKey(key: string): boolean {
  return IDEMPOTENCY_KEY_PATTERN.test(key);
}
