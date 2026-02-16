import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

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
  metadata?: any;
  signature: string;
}

export async function generateReceiptPDF(receipt: Receipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Generate QR code first (async)
    QRCode.toDataURL(`stxact://receipt/${receipt.receipt_id}`, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 200,
    })
      .then((qrCodeDataURL: string) => {
        const qrImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

        // Header
        doc.fontSize(24).text('stxact Payment Receipt', { align: 'center' });
        doc.moveDown();

        // QR code positioned in top-right
        doc.image(qrImage, 450, 80, { width: 100 });

        // Receipt ID
        doc.fontSize(10).text(`Receipt ID: ${receipt.receipt_id}`, 50, 100);

        // Payment Details Section
        doc.moveDown(2);
        doc.fontSize(14).text('Payment Details', { underline: true });
        doc.fontSize(10);
        doc.moveDown(0.5);
        doc.text(`Payment TX: ${receipt.payment_txid}`);
        doc.text(`Request Hash: ${receipt.request_hash}`);
        doc.text(`Block Height: ${receipt.block_height}`);
        doc.text(`Block Hash: ${receipt.block_hash}`);
        doc.text(`Timestamp: ${new Date(receipt.timestamp * 1000).toISOString()}`);

        // Service Provider Section
        doc.moveDown();
        doc.fontSize(14).text('Service Provider', { underline: true });
        doc.fontSize(10);
        doc.moveDown(0.5);
        doc.text(`Principal: ${receipt.seller_principal}`);
        if (receipt.seller_bns_name) {
          doc.text(`BNS Name: ${receipt.seller_bns_name}`);
        }
        if (receipt.service_policy_hash) {
          doc.text(`Policy Hash: ${receipt.service_policy_hash}`);
        }

        // Buyer Details Section
        if (receipt.buyer_principal) {
          doc.moveDown();
          doc.fontSize(14).text('Buyer', { underline: true });
          doc.fontSize(10);
          doc.moveDown(0.5);
          doc.text(`Principal: ${receipt.buyer_principal}`);
        }

        // Delivery Proof Section
        if (receipt.delivery_commitment) {
          doc.moveDown();
          doc.fontSize(14).text('Delivery Proof', { underline: true });
          doc.fontSize(10);
          doc.moveDown(0.5);
          doc.text(`Commitment: ${receipt.delivery_commitment.substring(0, 64)}...`);
          doc.text(`Revision: ${receipt.revision === 1 ? 'Verified' : 'Initial'}`);
        }

        // Cryptographic Proof Section
        doc.moveDown();
        doc.fontSize(14).text('Cryptographic Proof', { underline: true });
        doc.fontSize(8);
        doc.moveDown(0.5);
        doc.text(`Signature: ${receipt.signature}`, { width: 500 });
        doc.text(`Key Version: ${receipt.key_version}`);

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).fillColor('gray').text(
          'This receipt is cryptographically signed and verifiable on the Stacks blockchain.',
          {
            align: 'center',
          }
        );

        doc.end();
      })
      .catch(reject);
  });
}

/**
 * Generate CSV export for a single receipt
 */
export function generateReceiptCSV(receipt: Receipt): string {
  const metadata = receipt.metadata || {};
  const priceSats = metadata.price_sats || '';
  const priceSTX = priceSats ? (parseInt(priceSats) / 1_000_000).toFixed(6) : '';

  const rows = [
    ['Field', 'Value'],
    ['Receipt ID', receipt.receipt_id],
    ['Timestamp', new Date(receipt.timestamp * 1000).toISOString()],
    ['Seller Principal', receipt.seller_principal],
    ['Seller BNS Name', receipt.seller_bns_name || ''],
    ['Buyer Principal', receipt.buyer_principal || ''],
    ['Payment Transaction', receipt.payment_txid],
    ['Request Hash', receipt.request_hash],
    ['Delivery Commitment', receipt.delivery_commitment || ''],
    ['Amount (STX)', priceSTX],
    ['Amount (microSTX)', priceSats],
    ['Endpoint', metadata.endpoint || ''],
    ['Block Height', receipt.block_height?.toString() || ''],
    ['Block Hash', receipt.block_hash || ''],
    ['Key Version', receipt.key_version.toString()],
    ['Revision', receipt.revision.toString()],
    ['Service Policy Hash', receipt.service_policy_hash || ''],
    ['Signature', receipt.signature],
  ];

  return rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Generate bulk CSV export for multiple receipts
 */
export function generateBulkReceiptCSV(receipts: Receipt[]): string {
  if (receipts.length === 0) {
    return 'No receipts to export';
  }

  const headers = [
    'Receipt ID',
    'Timestamp',
    'Seller Principal',
    'Seller BNS',
    'Buyer Principal',
    'Payment TX',
    'Request Hash',
    'Amount (STX)',
    'Endpoint',
    'Block Height',
    'Signature (truncated)',
  ];

  const rows = receipts.map(receipt => {
    const metadata = receipt.metadata || {};
    const priceSats = metadata.price_sats || '';
    const priceSTX = priceSats ? (parseInt(priceSats) / 1_000_000).toFixed(6) : '';

    return [
      receipt.receipt_id,
      new Date(receipt.timestamp * 1000).toISOString(),
      receipt.seller_principal,
      receipt.seller_bns_name || '',
      receipt.buyer_principal || '',
      receipt.payment_txid,
      receipt.request_hash,
      priceSTX,
      metadata.endpoint || '',
      receipt.block_height?.toString() || '',
      receipt.signature.substring(0, 32) + '...',
    ];
  });

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
