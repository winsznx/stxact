import { createHash } from 'crypto';
import { canonicalize } from './canonicalize';

/**
 * Compute SHA-256 hash of a JSON deliverable (response body)
 *
 * Algorithm:
 * 1. Recursively sort all object keys at all nesting levels
 * 2. Serialize to JSON with no whitespace
 * 3. Compute SHA-256 hash
 * 4. Return lowercase hex string
 *
 * PRD Reference: Section 10 - Deliverable Hashing for JSON Responses
 */
export function computeDeliverableHash(responseBody: unknown): string {
  const canonicalJson = JSON.stringify(canonicalize(responseBody));
  return createHash('sha256').update(canonicalJson).digest('hex').toLowerCase();
}

/**
 * Compute SHA-256 hash of a binary deliverable (PDF, image, etc.)
 *
 * Algorithm:
 * 1. Hash the raw bytes directly
 * 2. Return lowercase hex string
 *
 * PRD Reference: Section 10 - Deliverable Hashing for Binary Artifacts
 */
export function hashBinaryDeliverable(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').toLowerCase();
}

/**
 * Verify delivery: compare computed hash with expected hash
 *
 * @param responseBody - The actual response body received
 * @param expectedHash - The delivery_commitment hash from receipt
 * @returns true if hashes match, false otherwise
 */
export function verifyDelivery(responseBody: unknown, expectedHash: string): boolean {
  const actualHash = computeDeliverableHash(responseBody);
  return actualHash === expectedHash.toLowerCase();
}


/**
 * Supported cryptographic hashing algorithms for deliverables.
 */
export type HashAlgorithm = 'sha256' | 'keccak256';
