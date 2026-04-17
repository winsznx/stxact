export const ALLOWED_DISPUTE_REASONS = [
  'delivery_hash_mismatch',
  'no_response',
  'incomplete_delivery',
  'fraudulent_quote',
] as const;

export type DisputeReason = (typeof ALLOWED_DISPUTE_REASONS)[number];

export function isValidDisputeReason(reason: string): reason is DisputeReason {
  return (ALLOWED_DISPUTE_REASONS as readonly string[]).includes(reason);
}
