# Completion Architecture - stxact System Integration

**Generated:** 2026-02-14
**Purpose:** Define how new components integrate with existing production-grade core
**Scope:** Architecture for remaining user-facing layers

---

## I. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      STXACT COMPLETE SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser    │         │   Web App    │         │   CLI Tool   │
│  Extension   │────────▶│  (Next.js)   │◀────────│  (Commander) │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        ▼                         │
       │              ┌─────────────────┐               │
       └─────────────▶│   REST API      │◀──────────────┘
                      │   (Express.js)  │
                      └─────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  PostgreSQL  │  │    Stacks    │  │    Redis     │
    │   Database   │  │  Blockchain  │  │   (Cache)    │
    └──────────────┘  └──────────────┘  └──────────────┘
```

---

## II. Component Architecture

### A. Existing Production Core (✅ Complete)

**1. Backend API (Express.js)**
```
packages/proxy/
├── src/
│   ├── index.ts                    # Express app setup
│   ├── api/
│   │   ├── receipts.ts             # 3 endpoints ✅
│   │   ├── directory.ts            # 2 endpoints ✅
│   │   ├── disputes.ts             # 3 endpoints ✅
│   │   └── demo.ts                 # 1 endpoint ✅
│   ├── middleware/
│   │   ├── x402-payment-gate.ts    # Payment verification ✅
│   │   └── generate-receipt.ts     # Receipt generation ✅
│   ├── crypto/
│   │   ├── signatures.ts           # ECDSA signing ✅
│   │   ├── receipt-canonical.ts    # Canonical messages ✅
│   │   └── payment-binding.ts      # Replay protection ✅
│   ├── blockchain/
│   │   ├── nonce-manager.ts        # Thread-safe nonces ✅
│   │   └── receipt-anchor.ts       # Merkle batching ✅
│   └── storage/
│       └── db.ts                   # PostgreSQL pool ✅
```

**Architecture Principles:**
- Strict TypeScript (no `any` except justified)
- Structured logging (logger with context objects)
- Error classes with context
- Atomic transactions
- Connection pooling

---

### B. New Web Application (Next.js)

**Location:** `packages/webapp/`

**Architecture:**
```
src/
├── app/                      # Next.js 14 App Router
│   ├── layout.tsx            # Root layout with wallet provider
│   ├── page.tsx              # Landing page
│   ├── directory/
│   │   ├── page.tsx          # Service listing
│   │   └── [principal]/
│   │       └── page.tsx      # Service detail
│   ├── receipts/
│   │   ├── page.tsx          # Receipt dashboard
│   │   └── [id]/
│   │       └── page.tsx      # Receipt viewer
│   ├── disputes/
│   │   ├── page.tsx          # Disputes list
│   │   ├── [id]/
│   │   │   └── page.tsx      # Dispute detail
│   │   └── create/
│   │       └── page.tsx      # File dispute form
│   └── seller/
│       ├── register/
│       │   └── page.tsx      # Registration wizard
│       └── dashboard/
│           └── page.tsx      # Analytics
├── components/
│   ├── WalletConnect.tsx     # Stacks Connect integration
│   ├── ReceiptViewer.tsx     # Receipt display component
│   ├── ServiceCard.tsx       # Service grid item
│   ├── DisputeForm.tsx       # Dispute filing form
│   └── ReputationBadge.tsx   # Reputation display
├── lib/
│   ├── api.ts                # API client (axios wrapper)
│   └── stacks.ts             # Wallet utilities
└── types/
    └── index.ts              # Shared TypeScript types
```

**Data Flow:**
```
User Browser
    │
    ▼
Next.js App (Client-Side React)
    │
    │ [API calls via lib/api.ts]
    │
    ▼
Express API (http://localhost:3000)
    │
    │ [Database queries]
    │
    ▼
PostgreSQL (receipts, services, disputes)
    │
    │ [Contract calls]
    │
    ▼
Stacks Blockchain (contracts, nonce manager)
```

**Key Integration Points:**
1. **API Client** (`lib/api.ts`):
   ```typescript
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

   export const api = {
     get: async (endpoint: string) => {
       const res = await fetch(`${API_BASE}${endpoint}`);
       if (!res.ok) throw new Error(res.statusText);
       return res.json();
     },
     post: async (endpoint: string, data: any) => {
       const res = await fetch(`${API_BASE}${endpoint}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       });
       if (!res.ok) throw new Error(res.statusText);
       return res.json();
     }
   };
   ```

2. **Wallet Integration** (`components/WalletConnect.tsx`):
   - Uses `@stacks/connect` for Hiro Wallet
   - Stores user session in `UserSession`
   - Provides address to child components via Context

3. **Type Safety**:
   - Share types from backend: `packages/proxy/src/types/`
   - Import in frontend: `import type { Receipt } from '@stxact/proxy'`

---

### C. Browser Extension

**Location:** `packages/extension/`

**Architecture:**
```
extension/
├── manifest.json             # Extension manifest (v3)
├── background/
│   └── service-worker.ts     # HTTP 402 interceptor
├── popup/
│   ├── index.html
│   ├── index.tsx             # React app (dashboard)
│   └── components/
│       ├── PaymentModal.tsx  # Payment approval
│       └── ReceiptList.tsx   # Stored receipts
├── content/
│   └── injector.ts           # Inject 402 handler into pages
└── lib/
    ├── storage.ts            # chrome.storage wrapper
    └── payments.ts           # Stacks transaction signing
```

**Service Worker (Background Script):**
```typescript
// background/service-worker.ts

chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    const paymentRequired = details.responseHeaders?.find(
      h => h.name.toLowerCase() === 'payment-required'
    );

    if (paymentRequired && details.statusCode === 402) {
      // Show payment modal
      const payment = JSON.parse(atob(paymentRequired.value));

      const approved = await showPaymentModal(payment);

      if (approved) {
        // Sign and broadcast transaction
        const txid = await sendStacksPayment(payment);

        // Retry request with payment signature
        return retryWithPayment(details.url, txid);
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking", "responseHeaders"]
);
```

**Integration with Core:**
- Calls same API endpoints as web app
- Stores receipts in `chrome.storage.local`
- Syncs with backend on demand

---

### D. CLI Tool

**Location:** `packages/cli/`

**Architecture:**
```
cli/
├── bin/
│   └── stxact.js             # Entry point
├── src/
│   ├── commands/
│   │   ├── init.ts           # stxact init
│   │   ├── login.ts          # stxact login
│   │   ├── curl.ts           # stxact curl <url>
│   │   ├── services.ts       # stxact services list
│   │   ├── receipts.ts       # stxact receipts verify
│   │   └── disputes.ts       # stxact dispute create
│   ├── lib/
│   │   ├── api.ts            # API client (same as webapp)
│   │   ├── config.ts         # ~/.stxact/config.json
│   │   └── wallet.ts         # Key storage
│   └── index.ts              # Commander setup
└── package.json
```

**Key Command: `stxact curl`**
```typescript
// Auto-pay wrapper for curl

async function stxactCurl(url: string, options: CurlOptions) {
  const response = await fetch(url);

  if (response.status === 402) {
    const paymentReq = response.headers.get('payment-required');
    const payment = JSON.parse(atob(paymentReq));

    console.log(`💰 Payment required: ${payment.amount} ${payment.asset}`);

    const config = loadConfig(); // Load from ~/.stxact/config.json

    if (config.autoPay && payment.amount <= config.maxAutoPayAmount) {
      const txid = await sendPayment(payment, config.privateKey);
      console.log(`✅ Payment sent: ${txid}`);

      // Retry with payment signature
      const retryResponse = await fetch(url, {
        headers: { 'payment-signature': generateSignature(txid) }
      });

      return retryResponse.text();
    } else {
      console.log('❌ Auto-pay disabled or amount exceeds limit');
      console.log('Run: stxact pay <url> to pay manually');
    }
  }

  return response.text();
}
```

**Integration:**
- Reads API URL from `~/.stxact/config.json`
- Stores private key encrypted
- Generates receipts locally (same crypto lib)

---

### E. SDKs

**1. @stxact/sdk (Client Library)**

**Location:** `packages/sdk/`

```typescript
// Usage example:
import { StxactClient } from '@stxact/sdk';

const client = new StxactClient({
  apiUrl: 'https://api.stxact.com',
  network: 'mainnet',
  privateKey: process.env.STACKS_PRIVATE_KEY
});

// Auto-pay on 402
const response = await client.fetch('/data/premium', {
  autoPay: true,
  maxAmount: '100000' // 0.1 STX
});

// Get receipt
const receipt = client.getLastReceipt();
console.log('Receipt ID:', receipt.receipt_id);
```

**Architecture:**
```
sdk/
├── src/
│   ├── client.ts             # Main StxactClient class
│   ├── payment.ts            # Payment handling
│   ├── receipts.ts           # Receipt verification
│   └── types/
│       └── index.ts          # TypeScript definitions
└── package.json
```

**2. @stxact/server (Express Middleware)**

```typescript
// Usage example:
import { stxactMiddleware } from '@stxact/server';

app.use('/protected', stxactMiddleware({
  amountSTX: 0.1,
  payTo: 'SP1234...',
  generateReceipt: true
}));

app.get('/protected/data', (req, res) => {
  // req.receipt contains cryptographic proof
  res.json({ data: 'premium content' });
});
```

**3. @stxact/react (React Hooks)**

```typescript
// Usage example:
import { useReceipts, useStxact } from '@stxact/react';

function ReceiptDashboard() {
  const { receipts, loading } = useReceipts({
    sellerPrincipal: 'SP123...'
  });

  const { pay, verifyReceipt } = useStxact();

  return (
    <div>
      {receipts.map(receipt => (
        <ReceiptCard key={receipt.receipt_id} receipt={receipt} />
      ))}
    </div>
  );
}
```

---

## III. Database Schema (No Changes Needed ✅)

**All tables already exist with correct schema:**
- `receipts` (15 fields, all present)
- `services` (registration data)
- `disputes` (state machine)
- `used_payments` (replay protection)
- `reputation_events` (audit trail)
- `refund_authorizations` (seller signatures)

**Indexes optimized for queries:**
- `idx_receipts_seller` (service directory queries)
- `idx_receipts_buyer` (user dashboard queries)
- `idx_receipts_timestamp` (pagination)
- `idx_receipts_request_payment` (payment binding lookup)

---

## IV. Deployment Architecture

### Development Environment
```
Docker Compose:
  - postgres:15 (database)
  - redis:7 (cache)
  - proxy (Express API on :3000)
  - webapp (Next.js on :3001)
```

### Production Environment
```
┌─────────────────┐
│   CloudFlare    │  (CDN + DDoS protection)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load Balancer  │  (AWS ALB / GCP LB)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ API #1 │ │ API #2 │  (Express containers)
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌──────────┐ ┌──────────┐
│PostgreSQL│ │  Stacks  │
│  Primary │ │   Node   │
└──────────┘ └──────────┘
    │
    ▼
┌──────────┐
│PostgreSQL│
│ Replica  │
└──────────┘
```

**Horizontal Scaling:**
- Multiple API instances behind load balancer
- Stateless API (session in PostgreSQL/Redis)
- Nonce manager: Redis-based (future) or single-writer pattern

**Database:**
- Primary: Write operations
- Replica: Read operations (directory queries, receipt lookups)
- Connection pooling: 20 per instance

---

## V. Data Flow Diagrams

### Payment Flow
```
1. Browser → API: GET /protected/data
2. API → Browser: 402 + payment-required header
3. Browser → Facilitator: Payment transaction
4. Facilitator → Blockchain: Broadcast STX transfer
5. Browser → API: GET /protected/data + payment-signature
6. API → Facilitator: Verify payment signature
7. API → PostgreSQL: Bind payment to request hash
8. API → PostgreSQL: Store receipt
9. API → Blockchain: Update reputation (fire-and-forget)
10. API → Browser: 200 + receipt headers + data
```

### Dispute Flow
```
1. Buyer → API: POST /disputes (receipt_id, reason)
2. API → PostgreSQL: Create dispute (status: open)
3. API → Buyer: 201 + dispute_id

[... time passes ...]

4. Seller → API: POST /refunds (dispute_id, signature)
5. API → Crypto: Verify ECDSA signature
6. API → Blockchain: Call dispute-resolver.clar::execute-refund
7. Blockchain → Buyer Wallet: STX refund transfer
8. API → PostgreSQL: Update dispute (status: refunded, txid)
9. API → Seller: 200 + refund_txid
```

### Receipt Anchoring Flow
```
1. API: Generate receipt → Add to batch queue
2. Batch Manager: 100 receipts OR 1 hour timeout
3. Batch Manager: Compute Merkle root
4. Batch Manager → Blockchain: Call receipt-anchor.clar::anchor-receipt-batch
5. Blockchain: Store (merkle_root, batch_size, timestamp)
6. Batch Manager: Reset queue
```

---

## VI. Security Architecture

### Authentication
- **Web App:** Stacks Connect (wallet-based)
- **API:** No auth required for GET endpoints
- **API:** POST endpoints require signature verification
- **CLI:** Private key stored encrypted in ~/.stxact/

### Authorization
- **Service Registration:** Only deployer can register (tx-sender check)
- **Refund Execution:** Only seller can authorize (signature recovery)
- **Dispute Creation:** Anyone can file (public endpoint)
- **Receipt Verification:** Public (verifiable by anyone)

### Rate Limiting
```typescript
// Rate limits (per IP):
GET /.well-known/stxact-config   → 100 req/min
GET /directory/services          → 60 req/min
POST /receipts/verify            → 30 req/min
POST /disputes                   → 10 req/min
POST /refunds                    → 5 req/min
```

**Implementation:** Express rate-limit middleware + Redis

### Data Encryption
- **At Rest:** PostgreSQL disk encryption
- **In Transit:** TLS 1.3 (nginx/CloudFlare)
- **Private Keys:** AES-256 (CLI wallet storage)

---

## VII. Monitoring & Observability

### Metrics to Collect

**Application:**
```
stxact_payments_total{status="success|failed"}
stxact_receipts_generated_total
stxact_disputes_created_total{status="open|resolved|refunded"}
stxact_nonce_conflicts_total (should be 0)
stxact_api_requests_total{endpoint, status_code}
stxact_api_latency_seconds{endpoint, quantile="0.5|0.95|0.99"}
```

**Database:**
```
postgresql_connections_active
postgresql_query_duration_seconds{query_type}
postgresql_deadlocks_total
postgresql_transaction_rollbacks_total
```

**Blockchain:**
```
stacks_nonce_manager_pending{address}
stacks_contract_calls_total{contract, function, status}
stacks_mempool_tx_count
```

### Logging
```json
{
  "timestamp": "2026-02-14T10:30:00.000Z",
  "level": "info",
  "message": "receipt-generated",
  "context": {
    "receipt_id": "550e8400-e29b-41d4-a716-446655440000",
    "seller_principal": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "payment_txid": "0xabc123...",
    "block_height": 123456
  }
}
```

**Tools:**
- Prometheus (metrics)
- Grafana (dashboards)
- Loki (log aggregation)
- Sentry (error tracking)

---

## VIII. Testing Strategy

### Unit Tests
- Crypto functions (signature generation/verification)
- Nonce manager (concurrency)
- Payment binding (replay protection)
- **Coverage Target:** >80%

### Integration Tests
- API endpoints (all 17)
- Database transactions
- Contract calls (mocked)
- **Coverage Target:** 100% of endpoints

### E2E Tests (Playwright)
- Complete payment flow (browser → API → receipt)
- Dispute filing and resolution
- Service registration wizard
- **Coverage Target:** Critical user journeys

### Load Tests (k6)
- 100+ concurrent users
- Nonce manager stress test
- PDF generation at scale
- **Thresholds:** p95 < 2s, error rate < 1%

### Contract Tests (Clarinet)
- All Clarity functions
- Error cases
- State transitions
- **Coverage Target:** 100%

---

## IX. Rollout Plan

### Phase 1: API Completion (Week 1)
- Add 8 missing endpoints
- Integration tests for all endpoints
- OpenAPI documentation

### Phase 2: PDF/CSV (Week 1)
- pdfkit implementation
- QR code generation
- Bulk export

### Phase 3: Web App (Week 2)
- Next.js setup
- Service directory
- Receipt dashboard
- Dispute management

### Phase 4: Browser Extension (Week 3)
- Manifest v3 setup
- 402 interceptor
- Payment modal
- Receipt storage

### Phase 5: CLI + SDKs (Week 3)
- CLI commands
- @stxact/sdk
- @stxact/server
- @stxact/react

### Phase 6: Production Deployment (Week 4)
- CI/CD pipeline
- Monitoring setup
- Load testing
- Security audit

---

## X. Risk Mitigation

### High-Risk Areas
1. **Browser Extension Approval:** Chrome/Firefox review takes 1-2 weeks
   - **Mitigation:** Submit early, prepare for rejection feedback

2. **Nonce Manager at Scale:** In-memory state limits horizontal scaling
   - **Mitigation:** Implement Redis-based nonce manager (future)

3. **PDF Generation Memory:** Large batches could spike memory
   - **Mitigation:** Stream PDFs, limit batch size

### Medium-Risk Areas
1. **API Rate Limiting:** DDoS attacks
   - **Mitigation:** CloudFlare + Redis rate limiting

2. **Database Connection Pool:** Saturation under load
   - **Mitigation:** Monitor active connections, scale pool

---

**Architecture Complete. Ready for Implementation.**
