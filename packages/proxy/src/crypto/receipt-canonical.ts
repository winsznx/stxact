/**
 * Receipt Canonical Message Generation
 *
 * CRITICAL: This must match the EXACT format specified in PRD Section 8
 *
 * Canonical Message Format:
 * STXACT-RECEIPT:${receipt_id}:${request_hash}:${payment_txid}:${seller_principal}:${seller_bns_name}:${buyer_principal}:${delivery_commitment}:${timestamp}:${block_height}:${block_hash}:${key_version}:${revision}:${service_policy_hash}
 *
 * Field Ordering (IMMUTABLE):
 * 1. Magic prefix: STXACT-RECEIPT
 * 2. receipt_id
 * 3. request_hash
 * 4. payment_txid
 * 5. seller_principal
 * 6. seller_bns_name (empty string if undefined)
 * 7. buyer_principal (empty string if undefined)
 * 8. delivery_commitment (empty string if undefined)
 * 9. timestamp
 * 10. block_height
 * 11. block_hash
 * 12. key_version
 * 13. revision
 * 14. service_policy_hash (empty string if undefined)
 *
 * Optional fields use empty string ('') when undefined, NOT null or "undefined"
 *
 * PRD Reference: Section 8, lines 963-991
 */

export interface Receipt {
  receipt_id: string;
  request_hash: string;
  payment_txid: string;
  seller_principal: string;
  seller_bns_name?: string;
  buyer_principal?: string;
  delivery_commitment?: string;
  timestamp: number;
  block_height: number;
  block_hash: string;
  key_version: number;
  revision: number;
  service_policy_hash?: string;
  metadata?: Record<string, unknown>;
  signature?: string;
}

export function generateReceiptCanonicalMessage(
  receipt: Omit<Receipt, 'metadata' | 'signature'>
): string {
  const fields = [
    'STXACT-RECEIPT',
    receipt.receipt_id,
    receipt.request_hash,
    receipt.payment_txid,
    receipt.seller_principal,
    receipt.seller_bns_name || '',
    receipt.buyer_principal || '',
    receipt.delivery_commitment || '',
    receipt.timestamp.toString(),
    receipt.block_height.toString(),
    receipt.block_hash,
    receipt.key_version.toString(),
    receipt.revision.toString(),
    receipt.service_policy_hash || '',
  ];

  return fields.join(':');
}

/**
 * Validate that a receipt canonical message matches expected format
 * Used for testing and validation
 */
export function validateCanonicalMessage(message: string): boolean {
  const parts = message.split(':');

  if (parts.length !== 14) {
    return false;
  }

  if (parts[0] !== 'STXACT-RECEIPT') {
    return false;
  }

  return true;
}


/**
 * Branded type ensuring strings have undergone structural canonicalization.
 */
export type CanonicalReceiptStr = string & { readonly __brand: 'CanonicalReceipt' };
