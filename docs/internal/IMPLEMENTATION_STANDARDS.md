# Implementation Standards - stxact Project

**Generated:** 2026-02-14
**Purpose:** Enforce consistency with existing production-grade codebase
**Scope:** All new code must follow these standards

---

## I. TypeScript Standards

### Type Safety Rules

**STRICT MODE REQUIRED:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**FORBIDDEN:**
```typescript
// ❌ NEVER use any
const data: any = fetchData();

// ❌ NEVER use @ts-ignore
// @ts-ignore
const result = unsafeOperation();

// ❌ NEVER use @ts-expect-error without comment
// @ts-expect-error
const value = legacyFunction();

// ❌ NEVER use type assertion without justification
const element = document.getElementById('foo') as HTMLElement;
```

**ALLOWED:**
```typescript
// ✅ Proper typing
interface PaymentData {
  amount: string;
  asset: string;
  recipient: string;
}
const data: PaymentData = await fetchPaymentData();

// ✅ Type narrowing
if (element instanceof HTMLElement) {
  element.focus();
}

// ✅ Unknown with type guard
function isPaymentData(obj: unknown): obj is PaymentData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'amount' in obj &&
    'asset' in obj &&
    'recipient' in obj
  );
}

// ✅ @ts-expect-error with explanation (rare)
// @ts-expect-error - Legacy API returns string but types say number
const legacyId: string = getLegacyId();
```

### Interface vs Type

**Prefer `interface` for object shapes:**
```typescript
// ✅ Use interface for objects
interface Receipt {
  receipt_id: string;
  payment_txid: string;
  seller_principal: string;
  timestamp: number;
}

// ✅ Use type for unions/intersections
type ReceiptStatus = 'pending' | 'confirmed' | 'finalized';
type ReceiptWithMetadata = Receipt & { metadata: Record<string, any> };
```

### Null Safety

**Always handle null/undefined:**
```typescript
// ❌ Unsafe
function getServiceName(service: Service) {
  return service.bns_name.toUpperCase(); // Crash if null
}

// ✅ Safe
function getServiceName(service: Service): string {
  return service.bns_name?.toUpperCase() ?? service.principal;
}

// ✅ Explicit check
function getServiceName(service: Service): string {
  if (!service.bns_name) {
    return service.principal;
  }
  return service.bns_name.toUpperCase();
}
```

---

## II. Existing Code Patterns (MUST FOLLOW)

### Error Handling

**Pattern from existing codebase:**
```typescript
// File: packages/proxy/src/middleware/x402-payment-gate.ts

class PaymentVerificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentVerificationError';
  }
}

// Usage:
if (!paymentTx) {
  throw new PaymentVerificationError(
    'Payment transaction not found on blockchain',
    'PAYMENT_NOT_FOUND',
    { txid, blockHeight: currentBlock }
  );
}

// Catch and log:
try {
  await verifyPayment(txid);
} catch (error) {
  if (error instanceof PaymentVerificationError) {
    logger.error('Payment verification failed', {
      code: error.code,
      message: error.message,
      context: error.context
    });
    return res.status(402).json({
      error: error.code,
      message: error.message
    });
  }
  throw error; // Re-throw unknown errors
}
```

**Apply this pattern everywhere:**
```typescript
// New code should follow this:
class DisputeValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DisputeValidationError';
  }
}

// In dispute endpoint:
if (status === 'resolved' && !resolution_notes) {
  throw new DisputeValidationError(
    'Resolution notes required when resolving dispute',
    'MISSING_RESOLUTION_NOTES',
    { dispute_id, status }
  );
}
```

### Logging

**Pattern from existing codebase:**
```typescript
// File: packages/proxy/src/middleware/generate-receipt.ts

import { logger } from '../utils/logger';

// ✅ Structured logging with context
logger.info('receipt-generated', {
  receipt_id: receiptId,
  seller_principal: sellerPrincipal,
  payment_txid: paymentTxid,
  block_height: blockHeight
});

logger.error('nonce-conflict-detected', {
  address: deployerAddress,
  expected_nonce: expectedNonce,
  actual_nonce: actualNonce,
  retry_attempt: retryCount
});

// ❌ NEVER use console.log
console.log('Receipt generated:', receiptId); // FORBIDDEN

// ❌ NEVER log without context
logger.info('Receipt generated'); // Not helpful

// ❌ NEVER log sensitive data
logger.info('payment-received', {
  private_key: sellerKey, // SECURITY VIOLATION
  user_email: email       // PII VIOLATION
});
```

**Log Levels:**
- `debug`: Development-only details (disabled in production)
- `info`: Normal operations (receipt generated, payment verified)
- `warn`: Recoverable issues (nonce conflict retry, cache miss)
- `error`: Failed operations (payment verification failed, DB error)

### Database Queries

**Pattern from existing codebase:**
```typescript
// File: packages/proxy/src/storage/db.ts

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// ✅ Parameterized queries (SQL injection protection)
const result = await pool.query(
  'SELECT * FROM receipts WHERE receipt_id = $1',
  [receiptId]
);

// ✅ Transaction example
const client = await pool.connect();
try {
  await client.query('BEGIN');

  await client.query(
    'INSERT INTO receipts (...) VALUES ($1, $2, $3)',
    [receiptId, paymentTxid, sellerPrincipal]
  );

  await client.query(
    'INSERT INTO reputation_events (...) VALUES ($1, $2)',
    [sellerPrincipal, receiptId]
  );

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}

// ❌ NEVER concatenate SQL (SQL injection risk)
const query = `SELECT * FROM receipts WHERE receipt_id = '${receiptId}'`; // FORBIDDEN

// ❌ NEVER leak DB errors to client
catch (error) {
  res.status(500).json({ error: error.message }); // Leaks DB schema
}

// ✅ Generic error to client
catch (error) {
  logger.error('database-query-failed', { error });
  res.status(500).json({ error: 'internal_server_error' });
}
```

### Stacks Blockchain Interactions

**Pattern from existing codebase:**
```typescript
// File: packages/proxy/src/blockchain/nonce-manager.ts

import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode
} from '@stacks/transactions';
import { getStacksNetwork } from '../config/stacks';

// ✅ Nonce manager usage
const nonceManager = NonceManager.getInstance();
const nonce = await nonceManager.getNextNonce(deployerAddress);

const txOptions = {
  contractAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  contractName: 'reputation-map',
  functionName: 'record-delivery',
  functionArgs: [principalCV(sellerPrincipal), uintCV(paymentAmount)],
  senderKey: process.env.DEPLOYER_PRIVATE_KEY!,
  nonce,
  network: getStacksNetwork(),
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
  fee: 1000 // 0.001 STX
};

const transaction = await makeContractCall(txOptions);
const txid = await broadcastTransaction(transaction, network);

// ✅ Handle nonce conflicts
try {
  const txid = await broadcastTransaction(transaction, network);
  nonceManager.confirmNonce(deployerAddress, nonce);
} catch (error) {
  if (error.message.includes('ConflictingNonceInMempool')) {
    logger.warn('nonce-conflict', { address: deployerAddress, nonce });
    nonceManager.invalidateNonce(deployerAddress, nonce);
    // Retry will get fresh nonce
  } else {
    throw error;
  }
}
```

---

## III. API Design Standards

### Endpoint Naming

**Follow existing conventions:**
```
GET    /receipts                  # List all receipts
GET    /receipts/:receipt_id      # Get specific receipt
POST   /receipts/verify           # Verify receipt signature
GET    /receipts/:receipt_id/pdf  # Export as PDF

GET    /directory/services        # List services
GET    /directory/services/:principal  # Get service by principal
POST   /directory/services        # Register service

GET    /disputes                  # List disputes
GET    /disputes/:dispute_id      # Get dispute
POST   /disputes                  # Create dispute
PATCH  /disputes/:dispute_id      # Update dispute status
```

**URL conventions:**
- Plural nouns for collections: `/receipts`, `/services`, `/disputes`
- IDs in path: `/receipts/:receipt_id`
- Actions as verbs in path (rare): `/receipts/verify`
- Exports as file extensions: `/receipts/:id/pdf`, `/receipts/:id/csv`

### Request Validation

**Pattern from existing codebase:**
```typescript
// File: packages/proxy/src/api/disputes.ts

router.post('/', async (req: Request, res: Response) => {
  const { receipt_id, reason, evidence_url } = req.body;

  // ✅ Validate required fields
  if (!receipt_id || !reason) {
    res.status(400).json({
      error: 'missing_required_fields',
      message: 'receipt_id and reason are required',
      required_fields: ['receipt_id', 'reason']
    });
    return;
  }

  // ✅ Validate field formats
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receipt_id)) {
    res.status(400).json({
      error: 'invalid_receipt_id_format',
      message: 'receipt_id must be a valid UUID'
    });
    return;
  }

  // ✅ Validate field lengths
  if (reason.length > 1000) {
    res.status(400).json({
      error: 'reason_too_long',
      message: 'Reason must be 1000 characters or less'
    });
    return;
  }

  // ✅ Validate references exist
  const receiptExists = await pool.query(
    'SELECT 1 FROM receipts WHERE receipt_id = $1',
    [receipt_id]
  );

  if (receiptExists.rows.length === 0) {
    res.status(404).json({
      error: 'receipt_not_found',
      message: `Receipt with ID ${receipt_id} does not exist`
    });
    return;
  }

  // ... proceed with creation
});
```

### Response Formatting

**Standard response shapes:**
```typescript
// ✅ Success response (200/201)
{
  "receipt_id": "550e8400-e29b-41d4-a716-446655440000",
  "payment_txid": "0xabc123...",
  "seller_principal": "SP2J6ZY...",
  "timestamp": 1708012800
}

// ✅ List response with pagination
{
  "receipts": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}

// ✅ Error response (4xx/5xx)
{
  "error": "payment_not_found",
  "message": "Payment transaction not found on blockchain",
  "context": {
    "txid": "0xabc123...",
    "block_height": 123456
  }
}

// ❌ NEVER return inconsistent shapes
{
  "success": true,          // Don't mix with status codes
  "data": { ... }
}

// ❌ NEVER return arrays at top level
[
  { "receipt_id": "..." },  // Wrap in object
  { "receipt_id": "..." }
]
```

### HTTP Status Codes

**Use these consistently:**
```
200 OK              - Successful GET/PATCH/DELETE
201 Created         - Successful POST
400 Bad Request     - Invalid input (validation error)
401 Unauthorized    - Missing/invalid authentication
402 Payment Required - Payment needed to access resource
404 Not Found       - Resource doesn't exist
409 Conflict        - State conflict (e.g., invalid dispute transition)
500 Internal Error  - Unexpected server error
502 Bad Gateway     - Upstream service (Stacks node) failed
503 Service Unavailable - Rate limited or temporarily down
```

---

## IV. Frontend Standards (Next.js)

### Component Structure

**File organization:**
```typescript
// File: src/components/ReceiptViewer.tsx

'use client'; // Only if uses hooks/state

import { useState } from 'react';
import type { Receipt } from '@/types';

interface ReceiptViewerProps {
  receipt: Receipt;
  onVerify?: (receiptId: string) => void;
}

export function ReceiptViewer({ receipt, onVerify }: ReceiptViewerProps) {
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    try {
      // Call API
      await verifyReceipt(receipt.receipt_id);
      setVerified(true);
      onVerify?.(receipt.receipt_id);
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  return (
    <div className="receipt-card">
      <h3>Receipt {receipt.receipt_id}</h3>
      {/* ... */}
    </div>
  );
}
```

**Conventions:**
- Named exports (not default): `export function ReceiptViewer`
- Props interface named `ComponentNameProps`
- Use TypeScript for all props
- Keep components focused (single responsibility)

### Data Fetching

**Use React Query (not useEffect):**
```typescript
// ❌ Don't use useEffect for data fetching
function ReceiptList() {
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    fetch('/api/receipts')
      .then(r => r.json())
      .then(setReceipts);
  }, []);

  return <div>{/* ... */}</div>;
}

// ✅ Use React Query
import { useQuery } from '@tanstack/react-query';

function ReceiptList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => fetch('/api/receipts').then(r => r.json())
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data.receipts.map(receipt => (
        <ReceiptCard key={receipt.receipt_id} receipt={receipt} />
      ))}
    </div>
  );
}
```

### Styling

**Tailwind CSS conventions:**
```typescript
// ✅ Use Tailwind utility classes
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Connect Wallet
</button>

// ✅ Extract repeated patterns
const buttonClasses = "px-6 py-3 rounded-lg font-semibold transition-colors";
<button className={`${buttonClasses} bg-blue-600 hover:bg-blue-700`}>
  Primary
</button>
<button className={`${buttonClasses} bg-gray-200 hover:bg-gray-300`}>
  Secondary
</button>

// ❌ Don't write custom CSS unless necessary
<style>
  .custom-button {
    /* Avoid this */
  }
</style>
```

---

## V. Testing Standards

### Unit Tests

**Pattern:**
```typescript
// File: tests/unit/crypto/signatures.test.ts

import { describe, test, expect } from 'vitest';
import { signReceipt, verifyReceiptSignature } from '@/crypto/signatures';

describe('Receipt Signatures', () => {
  const privateKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc';
  const canonicalMessage = 'receipt|550e8400-e29b-41d4-a716-446655440000|...';

  test('signs receipt with ECDSA secp256k1', () => {
    const signature = signReceipt(canonicalMessage, privateKey);

    expect(signature).toMatch(/^[0-9a-f]{128,140}$/); // 64-70 bytes hex
    expect(signature.length).toBeGreaterThanOrEqual(128);
  });

  test('verifies valid signature', () => {
    const signature = signReceipt(canonicalMessage, privateKey);

    const isValid = verifyReceiptSignature(
      canonicalMessage,
      signature,
      '03a2d1e...' // Public key
    );

    expect(isValid).toBe(true);
  });

  test('rejects invalid signature', () => {
    const isValid = verifyReceiptSignature(
      canonicalMessage,
      '0'.repeat(130), // Invalid signature
      '03a2d1e...'
    );

    expect(isValid).toBe(false);
  });
});
```

### Integration Tests

**Pattern:**
```typescript
// File: tests/integration/api/receipts.test.ts

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/index';
import { pool } from '@/storage/db';

describe('GET /receipts/:receipt_id', () => {
  let testReceiptId: string;

  beforeAll(async () => {
    // Seed test data
    const result = await pool.query(
      'INSERT INTO receipts (receipt_id, payment_txid, seller_principal, timestamp) VALUES ($1, $2, $3, $4) RETURNING receipt_id',
      ['550e8400-e29b-41d4-a716-446655440000', '0xabc123', 'SP2J6ZY...', Date.now()]
    );
    testReceiptId = result.rows[0].receipt_id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM receipts WHERE receipt_id = $1', [testReceiptId]);
  });

  test('returns receipt by ID', async () => {
    const response = await request(app)
      .get(`/receipts/${testReceiptId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      receipt_id: testReceiptId,
      payment_txid: '0xabc123',
      seller_principal: 'SP2J6ZY...'
    });
  });

  test('returns 404 for non-existent receipt', async () => {
    const response = await request(app)
      .get('/receipts/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body.error).toBe('receipt_not_found');
  });
});
```

### E2E Tests

**Pattern (Playwright):**
```typescript
// File: tests/e2e/payment-flow.spec.ts

import { test, expect } from '@playwright/test';

test('complete payment flow', async ({ page }) => {
  // 1. Navigate to service directory
  await page.goto('http://localhost:3001/directory');

  // 2. Click on a service
  await page.click('text=Premium Data API');

  // 3. Click "Make Payment"
  await page.click('button:has-text("Make Payment")');

  // 4. Wallet modal opens (mock or use test wallet)
  await expect(page.locator('.wallet-modal')).toBeVisible();

  // 5. Confirm payment
  await page.click('button:has-text("Confirm Payment")');

  // 6. Wait for receipt
  await page.waitForSelector('.receipt-success', { timeout: 10000 });

  // 7. Verify receipt displayed
  const receiptId = await page.locator('.receipt-id').textContent();
  expect(receiptId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
});
```

---

## VI. Security Standards

### Input Validation

**Always validate:**
```typescript
// ✅ Validate Stacks principals
function validateStacksPrincipal(principal: string): boolean {
  return /^S[TP][0-9A-Z]{38,40}$/.test(principal);
}

// ✅ Validate UUIDs
function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ✅ Validate transaction IDs
function validateTxid(txid: string): boolean {
  return /^0x[0-9a-f]{64}$/i.test(txid);
}

// ✅ Sanitize user input (display only)
import DOMPurify from 'dompurify';

function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input);
}

// ❌ NEVER trust user input directly
const query = `SELECT * FROM users WHERE name = '${userName}'`; // SQL injection

// ❌ NEVER use eval or Function constructor
eval(userCode); // Code injection
new Function(userCode)(); // Code injection
```

### Secrets Management

**Environment variables:**
```typescript
// ✅ Load from .env (never commit .env)
import dotenv from 'dotenv';
dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;
const DB_PASSWORD = process.env.DB_PASSWORD!;

// ✅ Validate required secrets
const requiredEnvVars = [
  'DEPLOYER_PRIVATE_KEY',
  'DB_PASSWORD',
  'DB_HOST',
  'STACKS_API_URL'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

// ❌ NEVER hardcode secrets
const privateKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc'; // SECURITY VIOLATION

// ❌ NEVER log secrets
logger.info('deployer-address', {
  private_key: DEPLOYER_PRIVATE_KEY // FORBIDDEN
});

// ✅ Log safe data only
logger.info('deployer-address', {
  address: getAddressFromPrivateKey(DEPLOYER_PRIVATE_KEY)
});
```

### CORS Configuration

```typescript
// File: packages/proxy/src/index.ts

import cors from 'cors';

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://stxact.com', 'https://app.stxact.com']
  : ['http://localhost:3001', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

## VII. Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `docs`: Documentation only
- `chore`: Maintenance tasks (dependencies, config)

**Examples:**
```
feat(api): add GET /receipts/:id/pdf endpoint

Implement PDF generation for receipts using pdfkit.
Includes QR code with receipt verification URL.

Closes #42

---

fix(nonce): handle ConflictingNonceInMempool error

Add retry logic when nonce conflicts detected in mempool.
Invalidate cached nonce and fetch fresh value.

---

refactor(crypto): extract signature verification to helper

Move ECDSA verification logic from middleware to
crypto/signatures.ts for reusability.

---

test(api): add integration tests for dispute endpoints

Cover all state transitions and error cases.

---

docs(readme): update deployment instructions

Add Docker Compose setup steps.
```

### Branch Naming

```
feature/pdf-generation
bugfix/nonce-conflict-retry
refactor/signature-verification
docs/api-documentation
```

---

## VIII. Performance Standards

### Database Query Optimization

**Use indexes:**
```sql
-- Already exists in schema
CREATE INDEX idx_receipts_seller ON receipts(seller_principal);
CREATE INDEX idx_receipts_buyer ON receipts(buyer_principal);
CREATE INDEX idx_receipts_timestamp ON receipts(timestamp DESC);
```

**Avoid N+1 queries:**
```typescript
// ❌ N+1 query problem
const receipts = await pool.query('SELECT * FROM receipts');
for (const receipt of receipts.rows) {
  const seller = await pool.query(
    'SELECT * FROM services WHERE principal = $1',
    [receipt.seller_principal]
  ); // N queries!
}

// ✅ Join or batch fetch
const receipts = await pool.query(`
  SELECT r.*, s.bns_name, s.reputation_score
  FROM receipts r
  LEFT JOIN services s ON r.seller_principal = s.principal
`);
```

**Pagination:**
```typescript
// ✅ Always paginate large result sets
router.get('/receipts', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await pool.query(
    'SELECT * FROM receipts ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  res.json({
    receipts: result.rows,
    pagination: { limit, offset, has_more: result.rows.length === limit }
  });
});
```

### Caching

**Use Redis for:**
- Service directory (refresh every 5 minutes)
- Reputation scores (refresh every 1 minute)
- Nonce values (ephemeral)

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
});

// ✅ Cache with TTL
async function getServiceDirectory(): Promise<Service[]> {
  const cached = await redis.get('services:directory');

  if (cached) {
    return JSON.parse(cached);
  }

  const services = await pool.query('SELECT * FROM services WHERE active = true');

  await redis.set(
    'services:directory',
    JSON.stringify(services.rows),
    'EX',
    300 // 5 minutes
  );

  return services.rows;
}
```

### Memory Management

**Stream large responses:**
```typescript
// ❌ Load entire PDF into memory
router.get('/receipts/:id/pdf', async (req, res) => {
  const receipts = await pool.query('SELECT * FROM receipts');
  const pdf = await generateBulkPDF(receipts.rows); // Could be GBs!
  res.send(pdf);
});

// ✅ Stream PDF generation
router.get('/receipts/:id/pdf', async (req, res) => {
  const receipt = await pool.query(
    'SELECT * FROM receipts WHERE receipt_id = $1',
    [req.params.id]
  );

  res.setHeader('Content-Type', 'application/pdf');
  const stream = await generateReceiptPDFStream(receipt.rows[0]);
  stream.pipe(res);
});
```

---

## IX. Documentation Standards

### Code Comments

**When to comment:**
```typescript
// ✅ Explain WHY, not WHAT (when non-obvious)
// Use block height instead of timestamp to prevent time manipulation attacks
const blockHeight = await getBlockHeight();

// ✅ Document complex algorithms
/**
 * Compute Merkle root for receipt batch using SHA-256.
 * Leaves are hashed receipt IDs, nodes are hash(left || right).
 * Returns 32-byte hex string.
 */
function computeMerkleRoot(receiptIds: string[]): string {
  // ...
}

// ❌ Don't state the obvious
// Increment counter
counter++;

// ❌ Don't explain code that should be self-evident
// Check if user is authenticated
if (isAuthenticated) {
  // ...
}
```

### API Documentation

**Use JSDoc for public APIs:**
```typescript
/**
 * Verify a receipt signature using ECDSA secp256k1.
 *
 * @param canonicalMessage - The canonical receipt message (pipe-delimited fields)
 * @param signature - The hex-encoded ECDSA signature (DER format)
 * @param publicKey - The hex-encoded public key (compressed)
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = verifyReceiptSignature(
 *   'receipt|550e8400-...|0xabc123|...',
 *   '304402207f3a1b...',
 *   '03a2d1e8f5c7...'
 * );
 * ```
 */
export function verifyReceiptSignature(
  canonicalMessage: string,
  signature: string,
  publicKey: string
): boolean {
  // ...
}
```

---

## X. Checklist Before Committing

**Every commit must:**
- [ ] Pass TypeScript compilation (`npm run build`)
- [ ] Pass all tests (`npm test`)
- [ ] Pass linter (`npm run lint`)
- [ ] Have no `console.log` statements
- [ ] Have no `any` types (except justified with comment)
- [ ] Have no hardcoded secrets
- [ ] Follow existing code patterns
- [ ] Include tests for new functionality
- [ ] Update documentation if API changed

---

**Standards Complete. Ready for Disciplined Implementation.**
