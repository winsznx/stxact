import { createHash } from 'crypto';

/**
 * Round timestamp to nearest bucket interval for replay protection
 *
 * Default bucket size: 300 seconds (5 minutes)
 * This provides replay protection while allowing clock drift tolerance
 *
 * PRD Reference: Section 8 - Timestamp Bucket
 */
export function getTimestampBucket(
  timestamp: number,
  bucketSize: number = parseInt(process.env.TIMESTAMP_BUCKET_SIZE || '300', 10)
): number {
  return Math.floor(timestamp / bucketSize) * bucketSize;
}

/**
 * Compute request hash for replay protection and idempotency
 *
 * Components:
 * - HTTP method (uppercase)
 * - Request path (normalized, no query params)
 * - SHA-256 hash of request body (empty body → hash of empty string)
 * - Timestamp bucket (rounded to nearest 300 seconds)
 * - Optional idempotency key
 *
 * Algorithm:
 * 1. Hash request body with SHA-256
 * 2. Concatenate: method:path:bodyHash:timestampBucket[:idempotencyKey]
 * 3. Hash the concatenated string with SHA-256
 * 4. Return lowercase hex string
 *
 * PRD Reference: Section 8 - Replay Protection and Idempotency
 */
export function computeRequestHash(
  method: string,
  path: string,
  body: string,
  timestampBucket: number,
  idempotencyKey?: string
): string {
  const bodyHash = createHash('sha256').update(body || '').digest('hex');

  const components = [
    method.toUpperCase(),
    path,
    bodyHash,
    timestampBucket.toString(),
  ];

  if (idempotencyKey) {
    components.push(idempotencyKey);
  }

  const canonical = components.join(':');
  return createHash('sha256').update(canonical).digest('hex').toLowerCase();
}

/**
 * Generate idempotency key from request hash and timestamp
 * Used when client doesn't provide X-Idempotency-Key header
 */
export function generateIdempotencyKey(requestHash: string, timestamp: number): string {
  return createHash('sha256').update(`${requestHash}:${timestamp}`).digest('hex');
}
