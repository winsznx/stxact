interface Receipt {
  receipt_id: string;
  request_hash: string;
  payment_txid: string;
  seller_principal: string;
  seller_bns_name: string | null;
  buyer_principal: string | null;
  delivery_commitment: string | null;
  timestamp: number;
  block_height: number;
  block_hash: string;
  key_version: number;
  revision: number;
  service_policy_hash: string | null;
  metadata?: Record<string, unknown>;
  signature: string;
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string | number | null): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV for a single receipt
 */
export function generateReceiptCSV(receipt: Receipt): string {
  const headers = [
    'receipt_id',
    'request_hash',
    'payment_txid',
    'seller_principal',
    'seller_bns_name',
    'buyer_principal',
    'delivery_commitment',
    'timestamp',
    'block_height',
    'block_hash',
    'key_version',
    'revision',
    'service_policy_hash',
    'signature',
  ];

  const values = [
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
    receipt.signature,
  ];

  const csvHeader = headers.join(',');
  const csvRow = values.map(escapeCSV).join(',');

  return `${csvHeader}\n${csvRow}`;
}

/**
 * Generate CSV for multiple receipts (bulk export)
 */
export function generateBulkReceiptsCSV(receipts: Receipt[]): string {
  if (receipts.length === 0) {
    return '';
  }

  const headers = [
    'receipt_id',
    'request_hash',
    'payment_txid',
    'seller_principal',
    'seller_bns_name',
    'buyer_principal',
    'delivery_commitment',
    'timestamp',
    'block_height',
    'block_hash',
    'key_version',
    'revision',
    'service_policy_hash',
    'signature',
  ];

  const csvHeader = headers.join(',');

  const rows = receipts.map((receipt) => {
    const values = [
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
      receipt.signature,
    ];

    return values.map(escapeCSV).join(',');
  });

  return `${csvHeader}\n${rows.join('\n')}`;
}
