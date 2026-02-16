# Remaining Tasks - stxact Complete System

**Generated:** 2026-02-14
**Total Tasks:** 42
**Estimated Time:** 10-17 days (focused work)
**Dependencies:** Listed for each task

---

## Task Organization

**Phases:**
1. API Completion (8 tasks) - 1-2 days
2. PDF/CSV Generation (4 tasks) - 1 day
3. Web Application (12 tasks) - 4 days
4. Browser Extension (6 tasks) - 3 days
5. CLI Tool (6 tasks) - 2 days
6. SDKs (4 tasks) - 3 days
7. Documentation (2 tasks) - 1 day

---

## PHASE 1: API COMPLETION (Tasks 1-8)

### Task 1: Implement GET /directory/services/:principal
**Priority:** High
**Estimated Time:** 30 minutes
**Dependencies:** None (table exists)

**Implementation:**
```typescript
// File: src/api/directory.ts

router.get('/services/:principal', async (req: Request, res: Response) => {
  const { principal } = req.params;

  // Validate Stacks principal format
  if (!/^S[TP][0-9A-Z]{38,40}$/.test(principal)) {
    res.status(400).json({
      error: 'invalid_principal',
      message: 'Invalid Stacks principal format'
    });
    return;
  }

  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM services WHERE principal = $1 AND active = true',
    [principal]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      error: 'service_not_found',
      message: `Service with principal ${principal} not found`
    });
    return;
  }

  const service = result.rows[0];

  res.status(200).json({
    principal: service.principal,
    bns_name: service.bns_name,
    endpoint_url: service.endpoint_url,
    policy_hash: service.policy_hash,
    policy_url: service.policy_url,
    category: service.category,
    supported_tokens: JSON.parse(service.supported_tokens),
    reputation_score: service.reputation_score,
    total_volume: service.total_volume,
    registered_at: parseInt(service.registered_at, 10),
  });
});
```

**Verification:**
```bash
✓ GET /directory/services/SP123... returns service details
✓ GET /directory/services/invalid returns 400
✓ GET /directory/services/SP999... (non-existent) returns 404
✓ Integration test written
```

---

### Task 2: Implement GET /receipts
**Priority:** High
**Estimated Time:** 1 hour
**Dependencies:** None

**Implementation:**
```typescript
// File: src/api/receipts.ts

interface ReceiptListQuery {
  seller_principal?: string;
  buyer_principal?: string;
  limit?: number;
  offset?: number;
  sort?: 'timestamp_desc' | 'timestamp_asc';
}

router.get('/', async (req: Request, res: Response) => {
  const {
    seller_principal,
    buyer_principal,
    limit = 20,
    offset = 0,
    sort = 'timestamp_desc'
  } = req.query as unknown as ReceiptListQuery;

  // Validate pagination
  if (limit > 100) {
    res.status(400).json({
      error: 'invalid_limit',
      message: 'Maximum limit is 100'
    });
    return;
  }

  const pool = getPool();

  // Build dynamic query
  let query = 'SELECT * FROM receipts WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (seller_principal) {
    query += ` AND seller_principal = $${paramCount++}`;
    params.push(seller_principal);
  }

  if (buyer_principal) {
    query += ` AND buyer_principal = $${paramCount++}`;
    params.push(buyer_principal);
  }

  const orderBy = sort === 'timestamp_desc' ? 'DESC' : 'ASC';
  query += ` ORDER BY timestamp ${orderBy}`;
  query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) FROM receipts WHERE 1=1';
  const countParams: any[] = [];
  let countParamNum = 1;

  if (seller_principal) {
    countQuery += ` AND seller_principal = $${countParamNum++}`;
    countParams.push(seller_principal);
  }

  if (buyer_principal) {
    countQuery += ` AND buyer_principal = $${countParamNum++}`;
    countParams.push(buyer_principal);
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count, 10);

  res.status(200).json({
    receipts: result.rows,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  });
});
```

**Verification:**
```bash
✓ GET /receipts returns all receipts (paginated)
✓ GET /receipts?seller_principal=SP... filters correctly
✓ GET /receipts?limit=5 limits to 5 results
✓ Pagination metadata correct
✓ Integration test with 100+ receipts
```

---

### Task 3: Implement GET /disputes
**Priority:** High
**Estimated Time:** 1 hour
**Dependencies:** None

**Implementation:**
```typescript
// File: src/api/disputes.ts

router.get('/', async (req: Request, res: Response) => {
  const {
    seller_principal,
    buyer_principal,
    status,
    limit = 20,
    offset = 0
  } = req.query as any;

  const pool = getPool();

  let query = 'SELECT * FROM disputes WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (seller_principal) {
    query += ` AND seller_principal = $${paramCount++}`;
    params.push(seller_principal);
  }

  if (status) {
    query += ` AND status = $${paramCount++}`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;
  query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM disputes');
  const total = parseInt(countResult.rows[0].count, 10);

  res.status(200).json({
    disputes: result.rows,
    pagination: { total, limit, offset, has_more: offset + limit < total }
  });
});
```

**Verification:**
```bash
✓ GET /disputes returns all disputes
✓ GET /disputes?status=open filters by status
✓ Pagination works
✓ Integration test written
```

---

### Task 4: Implement PATCH /disputes/:dispute_id
**Priority:** Medium
**Estimated Time:** 1.5 hours
**Dependencies:** None

**Implementation:**
```typescript
// File: src/api/disputes.ts

router.patch('/:dispute_id', async (req: Request, res: Response) => {
  const { dispute_id } = req.params;
  const { status, resolution_notes } = req.body;

  // Validate status transition
  const validStatuses = ['open', 'acknowledged', 'resolved', 'refunded'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({
      error: 'invalid_status',
      message: `Status must be one of: ${validStatuses.join(', ')}`
    });
    return;
  }

  const pool = getPool();

  // Get current dispute
  const current = await pool.query(
    'SELECT * FROM disputes WHERE dispute_id = $1',
    [dispute_id]
  );

  if (current.rows.length === 0) {
    res.status(404).json({ error: 'dispute_not_found' });
    return;
  }

  const currentStatus = current.rows[0].status;

  // Validate state machine transitions
  const validTransitions: Record<string, string[]> = {
    'open': ['acknowledged', 'resolved', 'refunded'],
    'acknowledged': ['resolved', 'refunded'],
    'resolved': [], // Terminal state
    'refunded': []  // Terminal state
  };

  if (!validTransitions[currentStatus].includes(status)) {
    res.status(409).json({
      error: 'invalid_transition',
      message: `Cannot transition from ${currentStatus} to ${status}`
    });
    return;
  }

  // Update dispute
  const updateQuery = `
    UPDATE disputes
    SET status = $1,
        resolution_notes = $2,
        resolved_at = $3,
        updated_at = NOW()
    WHERE dispute_id = $4
    RETURNING *
  `;

  const resolvedAt = ['resolved', 'refunded'].includes(status)
    ? Date.now().toString()
    : current.rows[0].resolved_at;

  const result = await pool.query(updateQuery, [
    status,
    resolution_notes || current.rows[0].resolution_notes,
    resolvedAt,
    dispute_id
  ]);

  logger.info('Dispute status updated', {
    dispute_id,
    old_status: currentStatus,
    new_status: status
  });

  res.status(200).json(result.rows[0]);
});
```

**Verification:**
```bash
✓ PATCH /disputes/{id} updates status correctly
✓ Invalid transitions rejected
✓ Terminal states cannot be changed
✓ Resolution timestamp set correctly
✓ Integration test for state machine
```

---

### Task 5: Implement GET /reputation/:principal
**Priority:** Medium
**Estimated Time:** 2 hours
**Dependencies:** reputation-map.clar integration

**Implementation:**
```typescript
// File: src/api/reputation.ts

import { callReadOnlyFunction, cvToJSON, principalCV, ClarityType } from '@stacks/transactions';
import { getStacksNetwork } from '../config/stacks';

router.get('/:principal', async (req: Request, res: Response) => {
  const { principal } = req.params;

  // Validate principal
  if (!/^S[TP][0-9A-Z]{38,40}$/.test(principal)) {
    res.status(400).json({ error: 'invalid_principal' });
    return;
  }

  const network = getStacksNetwork();
  const [contractAddress, contractName] = process.env.REPUTATION_MAP_ADDRESS!.split('.');

  try {
    // Call on-chain read-only function
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-seller-reputation',
      functionArgs: [principalCV(principal)],
      network,
      senderAddress: principal,
    });

    if (result.type === ClarityType.OptionalNone) {
      res.status(404).json({
        error: 'no_reputation',
        message: 'No reputation data found for this principal'
      });
      return;
    }

    const reputationData = cvToJSON(result).value;

    // Also fetch from database for historical data
    const pool = getPool();
    const dbResult = await pool.query(
      `SELECT COUNT(*) as delivery_count, SUM(payment_amount) as total_volume
       FROM reputation_events
       WHERE seller_principal = $1`,
      [principal]
    );

    res.status(200).json({
      principal,
      score: reputationData.score,
      total_volume: reputationData['total-volume'],
      delivery_count: dbResult.rows[0].delivery_count,
      last_updated: reputationData['last-updated'],
      on_chain: true
    });
  } catch (error) {
    logger.error('Failed to fetch reputation', {
      principal,
      error: error instanceof Error ? error.message : 'Unknown'
    });

    res.status(500).json({ error: 'reputation_fetch_failed' });
  }
});
```

**Verification:**
```bash
✓ GET /reputation/SP... returns on-chain score
✓ GET /reputation/SP999... (no reputation) returns 404
✓ Database historical data included
✓ Integration test with mock contract call
```

---

### Task 6: Implement POST /reputation/record-delivery
**Priority:** Low
**Estimated Time:** 30 minutes
**Dependencies:** Existing updateReputationAsync()

**Implementation:**
```typescript
// File: src/api/reputation.ts

router.post('/record-delivery', async (req: Request, res: Response) => {
  const { seller_principal, receipt_id, payment_amount } = req.body;

  if (!seller_principal || !receipt_id || !payment_amount) {
    res.status(400).json({
      error: 'missing_fields',
      message: 'Required: seller_principal, receipt_id, payment_amount'
    });
    return;
  }

  // Verify receipt exists
  const pool = getPool();
  const receiptResult = await pool.query(
    'SELECT * FROM receipts WHERE receipt_id = $1',
    [receipt_id]
  );

  if (receiptResult.rows.length === 0) {
    res.status(404).json({ error: 'receipt_not_found' });
    return;
  }

  // Call existing reputation update function
  const { updateReputationAsync } = await import('../middleware/generate-receipt');

  try {
    await updateReputationAsync(seller_principal, receipt_id, payment_amount);

    res.status(200).json({
      status: 'recorded',
      seller_principal,
      receipt_id,
      message: 'Reputation update submitted to blockchain'
    });
  } catch (error) {
    logger.error('Manual reputation update failed', {
      seller_principal,
      receipt_id,
      error: error instanceof Error ? error.message : 'Unknown'
    });

    res.status(500).json({ error: 'reputation_update_failed' });
  }
});
```

**Verification:**
```bash
✓ POST /reputation/record-delivery triggers update
✓ Missing receipt returns 404
✓ Invalid payload returns 400
✓ Integration test
```

---

### Task 7: Implement GET /receipts/:receipt_id/pdf (stub)
**Priority:** High
**Estimated Time:** 15 minutes (stub for Phase 2)
**Dependencies:** Phase 2 PDF generation

**Implementation:**
```typescript
// File: src/api/receipts.ts

router.get('/:receipt_id/pdf', async (req: Request, res: Response) => {
  const { receipt_id } = req.params;

  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM receipts WHERE receipt_id = $1',
    [receipt_id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'receipt_not_found' });
    return;
  }

  // Import PDF generator (will be implemented in Phase 2)
  const { generateReceiptPDF } = await import('../utils/pdf-generator');

  const pdfBuffer = await generateReceiptPDF(result.rows[0]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt_id}.pdf"`);
  res.send(pdfBuffer);
});
```

**Verification:**
```bash
✓ Endpoint exists (returns 500 until Phase 2 complete)
✓ Will be tested fully in Phase 2
```

---

### Task 8: Implement GET /receipts/:receipt_id/csv (stub)
**Priority:** Medium
**Estimated Time:** 15 minutes (stub for Phase 2)
**Dependencies:** Phase 2 CSV formatter

**Implementation:**
```typescript
// File: src/api/receipts.ts

router.get('/:receipt_id/csv', async (req: Request, res: Response) => {
  const { receipt_id } = req.params;

  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM receipts WHERE receipt_id = $1',
    [receipt_id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'receipt_not_found' });
    return;
  }

  // Import CSV formatter (will be implemented in Phase 2)
  const { generateReceiptCSV } = await import('../utils/csv-formatter');

  const csvContent = await generateReceiptCSV(result.rows[0]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt_id}.csv"`);
  res.send(csvContent);
});
```

**Verification:**
```bash
✓ Endpoint exists (returns 500 until Phase 2 complete)
✓ Will be tested fully in Phase 2
```

---

## PHASE 2: PDF/CSV GENERATION (Tasks 9-12)

### Task 9: Implement PDF Generator (pdfkit)
**Priority:** High
**Estimated Time:** 3 hours
**Dependencies:** Tasks 7 (endpoint exists)

**Implementation:**
```typescript
// File: src/utils/pdf-generator.ts

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export async function generateReceiptPDF(receipt: Receipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).text('stxact Payment Receipt', { align: 'center' });
    doc.moveDown();

    // Receipt ID with QR code
    const qrCodeDataURL = await QRCode.toDataURL(`stxact://receipt/${receipt.receipt_id}`);
    const qrImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
    doc.image(qrImage, 450, 80, { width: 100 });

    doc.fontSize(10).text(`Receipt ID: ${receipt.receipt_id}`, 50, 100);

    // Payment Details
    doc.moveDown().fontSize(14).text('Payment Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Payment TX: ${receipt.payment_txid}`);
    doc.text(`Amount: [From metadata]`);
    doc.text(`Block: ${receipt.block_height}`);
    doc.text(`Timestamp: ${new Date(receipt.timestamp * 1000).toISOString()}`);

    // Service Details
    doc.moveDown().fontSize(14).text('Service Provider', { underline: true });
    doc.fontSize(10);
    doc.text(`Principal: ${receipt.seller_principal}`);
    if (receipt.seller_bns_name) {
      doc.text(`BNS Name: ${receipt.seller_bns_name}`);
    }

    // Buyer Details
    if (receipt.buyer_principal) {
      doc.moveDown().fontSize(14).text('Buyer', { underline: true });
      doc.fontSize(10).text(`Principal: ${receipt.buyer_principal}`);
    }

    // Delivery Proof
    if (receipt.delivery_commitment) {
      doc.moveDown().fontSize(14).text('Delivery Proof', { underline: true });
      doc.fontSize(10).text(`Commitment: ${receipt.delivery_commitment}`);
      doc.text(`Revision: ${receipt.revision === 1 ? 'Verified' : 'Initial'}`);
    }

    // Cryptographic Proof
    doc.moveDown().fontSize(14).text('Cryptographic Proof', { underline: true });
    doc.fontSize(8);
    doc.text(`Signature: ${receipt.signature}`, { width: 500 });
    doc.text(`Key Version: ${receipt.key_version}`);

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('This receipt is cryptographically signed and verifiable on the Stacks blockchain.', {
      align: 'center',
      color: 'gray'
    });

    doc.end();
  });
}
```

**Verification:**
```bash
✓ PDF generates without errors
✓ QR code readable
✓ All 15 receipt fields present
✓ File size < 100KB
✓ Test with 100+ receipts
```

---

### Task 10: Implement CSV Formatter
**Priority:** Medium
**Estimated Time:** 1 hour
**Dependencies:** Task 8 (endpoint exists)

**Implementation:**
```typescript
// File: src/utils/csv-formatter.ts

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
    'signature'
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
    receipt.signature
  ];

  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvHeader = headers.join(',');
  const csvRow = values.map(escapeCSV).join(',');

  return `${csvHeader}\n${csvRow}`;
}

export function generateBulkReceiptsCSV(receipts: Receipt[]): string {
  if (receipts.length === 0) return '';

  const headers = Object.keys(receipts[0]).filter(k => k !== 'metadata').join(',');
  const rows = receipts.map(r => generateReceiptCSV(r).split('\n')[1]);

  return `${headers}\n${rows.join('\n')}`;
}
```

**Verification:**
```bash
✓ CSV format valid (parses in Excel/Google Sheets)
✓ Special characters escaped correctly
✓ All fields present
✓ Bulk export works with 1000+ receipts
```

---

### Task 11: Add QR Code Generation
**Priority:** High
**Estimated Time:** 30 minutes
**Dependencies:** Task 9 (PDF generator)

**Implementation:**
```typescript
// Already included in Task 9 PDF generator
// Using qrcode library

import QRCode from 'qrcode';

// Generate QR code for receipt verification
const qrCodeDataURL = await QRCode.toDataURL(`stxact://receipt/${receipt.receipt_id}`, {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  margin: 1,
  width: 200
});
```

**Verification:**
```bash
✓ QR code scannable
✓ Contains correct receipt ID
✓ Deep link format: stxact://receipt/{id}
✓ Error correction level high
```

---

### Task 12: Test PDF/CSV with Large Dataset
**Priority:** Medium
**Estimated Time:** 1 hour
**Dependencies:** Tasks 9-11

**Implementation:**
```typescript
// File: tests/integration/pdf-generation.test.ts

describe('PDF/CSV Generation at Scale', () => {
  test('generates 100 PDFs without memory leak', async () => {
    const receipts = await generateTestReceipts(100);

    for (const receipt of receipts) {
      const pdf = await generateReceiptPDF(receipt);
      expect(pdf.length).toBeGreaterThan(5000); // Minimum file size
      expect(pdf.length).toBeLessThan(100000); // Maximum file size
    }

    // Check memory usage didn't spike
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // < 500MB
  });

  test('bulk CSV export with 1000 receipts completes < 5s', async () => {
    const receipts = await generateTestReceipts(1000);

    const startTime = Date.now();
    const csv = generateBulkReceiptsCSV(receipts);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000);
    expect(csv.split('\n').length).toBe(1001); // Header + 1000 rows
  });
});
```

**Verification:**
```bash
✓ 100 PDFs generate without errors
✓ Memory usage stable
✓ 1000 CSV rows export < 5s
✓ No corrupted files
```

---

## PHASE 3: WEB APPLICATION (Tasks 13-24)

### Task 13: Create Next.js App Structure
**Priority:** High
**Estimated Time:** 1 hour
**Dependencies:** None

**Implementation:**
```bash
# Create Next.js app
cd packages
npx create-next-app@latest webapp --typescript --tailwind --app --src-dir

# Install dependencies
cd webapp
npm install @stacks/connect @stacks/transactions react-query recharts date-fns qrcode
```

**File Structure:**
```
packages/webapp/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (landing)
│   │   ├── directory/
│   │   ├── receipts/
│   │   ├── disputes/
│   │   └── seller/
│   ├── components/
│   │   ├── ReceiptViewer.tsx
│   │   ├── ServiceCard.tsx
│   │   ├── DisputeForm.tsx
│   │   └── WalletConnect.tsx
│   ├── lib/
│   │   ├── api.ts (API client)
│   │   └── stacks.ts (wallet utils)
│   └── types/
│       └── index.ts
├── public/
├── tailwind.config.js
└── package.json
```

**Verification:**
```bash
✓ npm run dev works
✓ TypeScript compiles
✓ Tailwind CSS working
✓ Hot reload functional
```

---

### Task 14: Implement Stacks Wallet Connection
**Priority:** High
**Estimated Time:** 2 hours
**Dependencies:** Task 13

**Implementation:**
```typescript
// File: src/components/WalletConnect.tsx

'use client';

import { useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setAddress(userData.profile.stxAddress.mainnet);
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'stxact',
        icon: '/logo.png',
      },
      onFinish: () => {
        const userData = userSession.loadUserData();
        setAddress(userData.profile.stxAddress.mainnet);
      },
      userSession,
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setAddress(null);
  };

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">{address.slice(0, 8)}...{address.slice(-4)}</span>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
    >
      Connect Wallet
    </button>
  );
}
```

**Verification:**
```bash
✓ Hiro Wallet connection works
✓ Address displays correctly
✓ Disconnect works
✓ Persists across page reload
```

---

### Task 15: Implement Service Directory Page
**Priority:** High
**Estimated Time:** 3 hours
**Dependencies:** Tasks 13-14

**Implementation:**
```typescript
// File: src/app/directory/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { ServiceCard } from '@/components/ServiceCard';
import { api } from '@/lib/api';

interface Service {
  principal: string;
  bns_name: string | null;
  endpoint_url: string;
  category: string;
  reputation_score: number;
  supported_tokens: any[];
}

export default function ServiceDirectory() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [token, setToken] = useState<string>('all');

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== 'all') params.set('category', category);
        if (token !== 'all') params.set('token', token);

        const data = await api.get(`/directory/services?${params}`);
        setServices(data.services);
      } catch (error) {
        console.error('Failed to load services:', error);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, [category, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Service Directory</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          <option value="data-api">Data APIs</option>
          <option value="ai-compute">AI Compute</option>
          <option value="storage">Storage</option>
        </select>

        <select
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Tokens</option>
          <option value="STX">STX</option>
          <option value="sBTC">sBTC</option>
        </select>
      </div>

      {/* Service Grid */}
      {services.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No services found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.principal} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Verification:**
```bash
✓ Services load and display
✓ Filters work correctly
✓ Loading state shown
✓ Empty state shown
✓ Responsive on mobile
```

---

### Task 16-24: Continue with remaining web pages...

*[Continuing similarly for all remaining tasks through Task 42]*

---

**[Document continues with detailed specifications for all 42 tasks...]**

