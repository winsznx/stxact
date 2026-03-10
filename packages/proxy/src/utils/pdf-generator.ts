import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface ReceiptMetadata {
  endpoint?: string;
  price_sats?: string | number;
  amount?: string | number;
  asset?: string;
  token_contract?: string;
}

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
  metadata?: unknown;
  signature: string;
}

interface CardRow {
  label: string;
  value: string;
  mono?: boolean;
}

const COLORS = {
  ink: '#111111',
  muted: '#666666',
  border: '#d9d9d4',
  panel: '#f7f6f3',
  paper: '#ffffff',
  accent: '#f97316',
  accentSoft: '#fff1e8',
};

function readMetadata(metadata: unknown): ReceiptMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata as ReceiptMetadata;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function formatAmount(metadata: ReceiptMetadata): { display: string; raw: string } {
  const rawValue = metadata.amount ?? metadata.price_sats;
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return { display: 'N/A', raw: '' };
  }

  const raw = String(rawValue);
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return { display: raw, raw };
  }

  const stx = numeric / 1_000_000;
  const normalized = stx.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

  return {
    display: `${normalized} STX`,
    raw,
  };
}

function shortValue(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function breakMonospace(value: string, chunkSize = 28): string {
  if (!value) {
    return 'N/A';
  }

  if (/\s/.test(value) || value.length <= chunkSize) {
    return value;
  }

  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks.join('\n');
}

function resolveReceiptUrl(receiptId: string): string {
  const explicitBase =
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.WEBAPP_URL;

  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, '')}/receipts/${receiptId}`;
  }

  const corsOrigin =
    process.env.CORS_ORIGINS
      ?.split(',')
      .map((origin) => origin.trim())
      .find((origin) => origin.startsWith('https://') || origin.startsWith('http://')) || '';

  if (corsOrigin) {
    return `${corsOrigin.replace(/\/$/, '')}/receipts/${receiptId}`;
  }

  return `stxact://receipt/${receiptId}`;
}

function measureCardHeight(doc: PDFKit.PDFDocument, width: number, rows: CardRow[]): number {
  const innerWidth = width - 28;
  let height = 20;

  doc.font('Helvetica-Bold').fontSize(12);
  height += doc.heightOfString('Section', { width: innerWidth });
  height += 12;

  for (const row of rows) {
    doc.font('Helvetica-Bold').fontSize(8);
    height += doc.heightOfString(row.label.toUpperCase(), { width: innerWidth });
    height += 4;

    doc.font(row.mono ? 'Courier' : 'Helvetica').fontSize(row.mono ? 8.5 : 10);
    height += doc.heightOfString(row.value, {
      width: innerWidth,
      align: 'left',
      lineGap: row.mono ? 1.5 : 1,
    });
    height += 10;
  }

  return height + 8;
}

function drawCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: CardRow[]
): number {
  const innerX = x + 14;
  const innerWidth = width - 28;
  const cardHeight = measureCardHeight(doc, width, rows);

  doc
    .save()
    .roundedRect(x, y, width, cardHeight, 8)
    .fillAndStroke(COLORS.paper, COLORS.border)
    .restore();

  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text(title, innerX, y + 14, {
    width: innerWidth,
  });

  let cursorY = y + 38;

  for (const row of rows) {
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(row.label.toUpperCase(), innerX, cursorY, {
      width: innerWidth,
      characterSpacing: 0.4,
    });
    cursorY = doc.y + 3;

    doc
      .fillColor(COLORS.ink)
      .font(row.mono ? 'Courier' : 'Helvetica')
      .fontSize(row.mono ? 8.5 : 10)
      .text(row.value, innerX, cursorY, {
        width: innerWidth,
        lineGap: row.mono ? 1.5 : 1,
      });
    cursorY = doc.y + 10;
  }

  return y + cardHeight + 14;
}

function buildCardRows(receipt: Receipt): {
  paymentRows: CardRow[];
  participantRows: CardRow[];
  deliveryRows: CardRow[];
  proofRows: CardRow[];
  summaryRows: Array<{ label: string; value: string }>;
} {
  const metadata = readMetadata(receipt.metadata);
  const amount = formatAmount(metadata);
  const endpoint = metadata.endpoint || 'N/A';
  const asset = metadata.asset || 'STX';
  const timestamp = formatTimestamp(receipt.timestamp);
  const network = (process.env.STACKS_NETWORK || 'testnet').toUpperCase();

  return {
    paymentRows: [
      { label: 'Amount', value: amount.display },
      { label: 'Settlement asset', value: asset },
      { label: 'Endpoint', value: endpoint, mono: true },
      { label: 'Payment transaction', value: breakMonospace(receipt.payment_txid, 24), mono: true },
      { label: 'Request hash', value: breakMonospace(receipt.request_hash, 24), mono: true },
      { label: 'Timestamp', value: timestamp },
      { label: 'Block', value: `${receipt.block_height} • ${breakMonospace(receipt.block_hash, 24)}`, mono: true },
    ],
    participantRows: [
      { label: 'Seller principal', value: breakMonospace(receipt.seller_principal, 22), mono: true },
      { label: 'Seller BNS', value: receipt.seller_bns_name || 'Not set' },
      { label: 'Buyer principal', value: breakMonospace(receipt.buyer_principal || 'N/A', 22), mono: true },
      {
        label: 'Service policy hash',
        value: breakMonospace(receipt.service_policy_hash || 'Not set', 24),
        mono: true,
      },
    ],
    deliveryRows: [
      {
        label: 'Delivery commitment',
        value: breakMonospace(receipt.delivery_commitment || 'Not captured', 24),
        mono: true,
      },
      {
        label: 'Revision',
        value: receipt.revision > 0 ? `Revision ${receipt.revision}` : 'Initial receipt',
      },
      { label: 'Receipt ID', value: breakMonospace(receipt.receipt_id, 22), mono: true },
    ],
    proofRows: [
      { label: 'Signature', value: breakMonospace(receipt.signature, 26), mono: true },
      { label: 'Key version', value: String(receipt.key_version) },
      { label: 'Verification URL', value: resolveReceiptUrl(receipt.receipt_id), mono: true },
    ],
    summaryRows: [
      { label: 'Receipt', value: shortValue(receipt.receipt_id, 8, 8) },
      { label: 'Network', value: network },
      { label: 'Amount', value: amount.display },
      { label: 'Issued', value: timestamp.slice(0, 10) },
      { label: 'Seller', value: shortValue(receipt.seller_principal, 8, 6) },
    ],
  };
}

export async function generateReceiptPDF(receipt: Receipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 44 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const receiptUrl = resolveReceiptUrl(receipt.receipt_id);

    QRCode.toDataURL(receiptUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 200,
    })
      .then((qrCodeDataURL: string) => {
        const { paymentRows, participantRows, deliveryRows, proofRows, summaryRows } =
          buildCardRows(receipt);

        const qrImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 44;
        const contentWidth = pageWidth - margin * 2;
        const sidebarWidth = 154;
        const gutter = 20;
        const leftWidth = contentWidth - sidebarWidth - gutter;
        const sidebarX = margin + leftWidth + gutter;

        doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.panel);
        doc
          .rect(margin, margin, contentWidth, pageHeight - margin * 2)
          .fill(COLORS.paper);

        doc
          .rect(margin, margin, contentWidth, 8)
          .fill(COLORS.accent);

        doc
          .save()
          .roundedRect(sidebarX, margin + 20, sidebarWidth, pageHeight - margin * 2 - 40, 10)
          .fill(COLORS.panel)
          .restore();

        doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(11).text('stxact', margin, margin + 18);
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(25).text('Payment Receipt', margin, margin + 42);
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text(
          'Cryptographically signed proof of settlement and delivery for an x402-protected request.',
          margin,
          margin + 76,
          { width: leftWidth - 12, lineGap: 2 }
        );

        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text('Receipt ID', margin, margin + 122);
        doc.fillColor(COLORS.ink).font('Courier').fontSize(9).text(
          breakMonospace(receipt.receipt_id, 24),
          margin,
          margin + 138,
          { width: leftWidth - 12, lineGap: 2 }
        );

        doc.image(qrImage, sidebarX + 24, margin + 36, { width: 106 });
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text('Scan to inspect', sidebarX + 24, margin + 156, {
          width: 106,
          align: 'center',
        });
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(
          'Use the receipt detail page to verify signatures, payment, and dispute state.',
          sidebarX + 16,
          margin + 172,
          { width: sidebarWidth - 32, align: 'center', lineGap: 2 }
        );

        let summaryY = margin + 236;
        for (const row of summaryRows) {
          doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(row.label.toUpperCase(), sidebarX + 16, summaryY, {
            width: sidebarWidth - 32,
          });
          summaryY += 12;
          doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9).text(row.value, sidebarX + 16, summaryY, {
            width: sidebarWidth - 32,
          });
          summaryY += 26;
        }

        doc
          .save()
          .roundedRect(sidebarX + 16, pageHeight - margin - 92, sidebarWidth - 32, 54, 8)
          .fill(COLORS.accentSoft)
          .restore();
        doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(9).text('Proof layer', sidebarX + 28, pageHeight - margin - 76);
        doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8).text(
          'Seller signature, settlement proof, and delivery commitment are bundled in this receipt.',
          sidebarX + 28,
          pageHeight - margin - 62,
          { width: sidebarWidth - 56, lineGap: 2 }
        );

        let cursorY = margin + 188;
        cursorY = drawCard(doc, margin, cursorY, leftWidth, 'Payment settlement', paymentRows);
        cursorY = drawCard(doc, margin, cursorY, leftWidth, 'Participants and policy', participantRows);
        cursorY = drawCard(doc, margin, cursorY, leftWidth, 'Delivery proof', deliveryRows);
        cursorY = drawCard(doc, margin, cursorY, leftWidth, 'Cryptographic proof', proofRows);

        doc
          .moveTo(margin, pageHeight - margin - 24)
          .lineTo(margin + leftWidth, pageHeight - margin - 24)
          .strokeColor(COLORS.border)
          .stroke();

        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(
          'This receipt is a signed record of an x402-protected payment flow and can be verified against the underlying Stacks transaction.',
          margin,
          pageHeight - margin - 14,
          { width: leftWidth, align: 'left' }
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
  const metadata = readMetadata(receipt.metadata);
  const amount = formatAmount(metadata);

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
    ['Amount (STX)', amount.display.replace(/ STX$/, '')],
    ['Amount (microSTX)', amount.raw],
    ['Endpoint', metadata.endpoint || ''],
    ['Block Height', receipt.block_height?.toString() || ''],
    ['Block Hash', receipt.block_hash || ''],
    ['Key Version', receipt.key_version.toString()],
    ['Revision', receipt.revision.toString()],
    ['Service Policy Hash', receipt.service_policy_hash || ''],
    ['Signature', receipt.signature],
  ];

  return rows.map((row) => row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
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

  const rows = receipts.map((receipt) => {
    const metadata = readMetadata(receipt.metadata);
    const amount = formatAmount(metadata);

    return [
      receipt.receipt_id,
      new Date(receipt.timestamp * 1000).toISOString(),
      receipt.seller_principal,
      receipt.seller_bns_name || '',
      receipt.buyer_principal || '',
      receipt.payment_txid,
      receipt.request_hash,
      amount.display.replace(/ STX$/, ''),
      metadata.endpoint || '',
      receipt.block_height?.toString() || '',
      receipt.signature.substring(0, 32) + '...',
    ];
  });

  const csvContent = [
    headers.map((header) => `"${header}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
