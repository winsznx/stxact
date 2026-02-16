# stxact Implementation Gaps & Complete User Journey Specification

## CRITICAL MISSING PIECES YOUR BUILD AGENT NEEDS

Your research agent gave you positioning. I'll give you **implementation reality**. Here's what's missing from the PRD that will make or break actual usability:

---

## 1️⃣ USER INTERACTION MODELS (How People Actually Use This)

### Gap: The PRD defines the protocol but not the user experience layers

You need to define **4 distinct interaction pathways**:

### A. **Web Interface (Human Buyers/Sellers)**

**Missing from PRD:**
- How does a buyer browse the service directory?
- How does a seller register their service?
- How does anyone view their receipts?
- Where do disputes get filed?

**What You Actually Need to Build:**

```
stxact-webapp/
├── pages/
│   ├── directory/          # Browse services
│   │   ├── index.tsx       # Service listing with filters
│   │   └── [serviceId].tsx # Service detail page
│   ├── receipts/
│   │   ├── index.tsx       # My receipts dashboard
│   │   ├── [id].tsx        # Single receipt viewer
│   │   └── [id]/export.tsx # PDF/CSV download
│   ├── disputes/
│   │   ├── index.tsx       # My disputes
│   │   ├── create.tsx      # File dispute form
│   │   └── [id].tsx        # Dispute detail + resolution
│   ├── register/
│   │   └── service.tsx     # Service registration wizard
│   └── dashboard/
│       ├── seller.tsx      # Seller analytics
│       └── buyer.tsx       # Buyer history
```

**Concrete User Flows to Implement:**

**Flow 1: Buyer Discovers and Pays for Service**
```
1. User lands on directory.stxact.io
2. Filters services by: reputation > 80, category = "DeFi Oracles"
3. Clicks "yield-api.btc" service card
4. Sees service details: description, pricing, reputation graph, recent reviews
5. Clicks "Try Service" → redirected to service URL
6. Service returns 402 → stxact browser extension intercepts
7. Extension shows: "Pay 0.001 sBTC to access yield-api.btc?"
8. User approves → payment sent
9. Receipt auto-generated and saved to user's account
10. User can view receipt at receipts.stxact.io/[receipt-id]
```

**Flow 2: Seller Registers Service**
```
1. Seller goes to register.stxact.io
2. Connects Stacks wallet
3. Fills form:
   - Service name (BNS or principal)
   - Endpoint URL
   - Category
   - Pricing
   - Description
4. Stakes 100 STX (UI shows: "This is your performance bond")
5. Contract registers service
6. Seller receives onboarding email with:
   - Proxy integration code snippet
   - Webhook endpoint for receipt notifications
   - Dashboard login link
```

**Missing UI Components You Need:**

```typescript
// Receipt Viewer Component
interface ReceiptViewerProps {
  receiptId: string;
  showActions: boolean; // Download, dispute, share
}

// Features:
// - QR code for receipt verification
// - Block explorer link for payment_txid
// - Download as PDF button
// - Dispute button (if within window)
// - Share receipt link
// - Signature verification status badge
```

---

### B. **CLI Tool (Developer/Power Users)**

**What's Missing:** The PRD lists 4 commands but doesn't explain the complete CLI UX flow.

**Complete CLI Specification:**

```bash
# Installation
npm install -g @stxact/cli
stxact init  # Creates ~/.stxact/config.json

# Configuration
stxact config set network testnet
stxact config set wallet-path ./wallet.json
stxact login  # Auth with Stacks wallet

# Service Discovery
stxact services list --min-rep 80 --category defi
stxact services info yield-api.btc
stxact services register \
  --name my-api \
  --endpoint https://api.example.com \
  --stake 100

# Making Requests
stxact curl https://yield-api.btc/quote \
  --method POST \
  --data '{"asset": "sBTC"}' \
  --auto-pay

# Output:
# ✓ Service requires payment: 0.001 sBTC
# ✓ Payment sent: tx 0xabc...
# ✓ Receipt generated: 7c9e6679-7425...
# ✓ Response received and verified
# 
# {
#   "quote": {...}
# }
#
# Receipt saved to: ~/.stxact/receipts/7c9e6679-7425.json

# Receipt Management
stxact receipts list --seller yield-api.btc
stxact receipts show 7c9e6679-7425
stxact receipts verify 7c9e6679-7425.json
stxact receipts export 7c9e6679-7425 --format pdf --output invoice.pdf

# Dispute Flow
stxact dispute create 7c9e6679-7425 \
  --reason delivery_hash_mismatch \
  --evidence ./response-payload.json

stxact dispute status dispute-uuid-123
stxact dispute resolve dispute-uuid-123  # Seller only
```

**CLI Configuration File (`~/.stxact/config.json`):**
```json
{
  "network": "testnet",
  "wallet": {
    "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "privateKey": "encrypted"
  },
  "defaults": {
    "autoPay": true,
    "verifyReceipts": true,
    "saveReceipts": true,
    "receiptDir": "~/.stxact/receipts"
  },
  "preferences": {
    "minReputation": 50,
    "maxPaymentSats": 100000,
    "requireAnchoring": false
  }
}
```

---

### C. **SDK Integration (Developer Embedding)**

**What's Missing:** How does a developer embed stxact into their existing app?

**Complete SDK Specification:**

```typescript
// Installation
npm install @stxact/sdk

// Basic Usage
import { StxactClient } from '@stxact/sdk';

const client = new StxactClient({
  network: 'testnet',
  wallet: userWallet,  // Stacks wallet instance
  config: {
    autoPay: true,
    minReputation: 80,
    saveReceipts: true,
    receiptStorage: 'localStorage' // or 'indexedDB' or 'none'
  }
});

// Making a paid request
const result = await client.request({
  service: 'yield-api.btc',
  endpoint: '/quote',
  method: 'POST',
  body: { asset: 'sBTC' },
  options: {
    maxPayment: '100000', // sats
    timeout: 30000
  }
});

// result contains:
// - response: the API response
// - receipt: the full receipt object
// - payment: payment transaction details

// Receipt Management
const receipts = await client.receipts.list({
  seller: 'yield-api.btc',
  dateFrom: '2024-01-01'
});

const receipt = await client.receipts.get('receipt-id');
const pdfBlob = await client.receipts.exportPDF('receipt-id');
const isValid = await client.receipts.verify(receipt);

// Dispute Flow
const dispute = await client.disputes.create({
  receiptId: 'receipt-id',
  reason: 'delivery_hash_mismatch',
  evidence: responsePayload
});

const status = await client.disputes.getStatus('dispute-id');

// Service Discovery
const services = await client.directory.search({
  category: 'defi',
  minReputation: 80,
  maxPriceSats: 100000
});
```

**React Hooks for Frontend:**
```typescript
import { useStxact, useReceipts, useServiceDirectory } from '@stxact/react';

function MyComponent() {
  const { request, loading } = useStxact();
  const { receipts } = useReceipts({ autoLoad: true });
  const { services } = useServiceDirectory({ minRep: 80 });

  const handleFetchYield = async () => {
    const { response, receipt } = await request({
      service: 'yield-api.btc',
      endpoint: '/quote',
      body: { asset: 'sBTC' }
    });
    
    // Response is auto-verified against delivery_commitment
    setYieldData(response);
  };

  return (
    <div>
      <button onClick={handleFetchYield}>
        Get Yield Quote
      </button>
      
      {receipts.map(r => (
        <ReceiptCard key={r.receipt_id} receipt={r} />
      ))}
    </div>
  );
}
```

---

### D. **Browser Extension (Seamless 402 Handling)**

**What's Missing:** How do regular users interact with 402 payments without CLI?

**Browser Extension Architecture:**

```
stxact-extension/
├── popup/              # Extension popup UI
│   ├── Dashboard.tsx   # Receipt history
│   ├── Settings.tsx    # Auto-pay rules
│   └── Service.tsx     # Service approval
├── background/         # Service worker
│   ├── 402-interceptor.ts
│   ├── receipt-manager.ts
│   └── wallet-connector.ts
├── content/            # Injected scripts
│   └── payment-modal.ts
└── manifest.json
```

**User Experience:**

```
1. User browses to https://yield-api.btc/quote
2. Service returns 402 with stxact headers
3. Extension detects 402 → injects payment modal
4. Modal shows:
   ┌─────────────────────────────────┐
   │ Payment Required                │
   │                                 │
   │ yield-api.btc                   │
   │ Reputation: ⭐ 94/100           │
   │                                 │
   │ Price: 0.001 sBTC               │
   │ Service: Yield Quote API        │
   │                                 │
   │ [ ] Remember for this service   │
   │                                 │
   │ [Cancel]  [Pay & Continue]      │
   └─────────────────────────────────┘
5. User clicks "Pay & Continue"
6. Extension sends payment, gets receipt
7. Page reloads with auth token from receipt
8. Receipt saved to extension storage
```

**Extension Settings:**

```
Auto-Pay Rules:
☑ Auto-approve payments < 10,000 sats
☑ Auto-approve if reputation > 80
☐ Require manual approval for all payments

Receipt Storage:
● Save receipts locally
○ Sync to stxact cloud account
○ Don't save receipts

Notifications:
☑ Show receipt confirmation
☑ Alert on dispute opportunities
☐ Weekly spending summary
```

---

## 2️⃣ RECEIPT VIEWING & DOWNLOADING (The Missing UX)

### Gap: PRD defines receipt format but not how users access/view receipts

**Complete Receipt Access Flows:**

### A. **Web Receipt Viewer** (`receipts.stxact.io/[id]`)

```typescript
// Receipt Page Components

<ReceiptViewer>
  <ReceiptHeader>
    <ReceiptID />
    <VerificationBadge status="verified" />
    <ExportButton formats={['pdf', 'json', 'csv']} />
  </ReceiptHeader>

  <ReceiptDetails>
    <Section title="Payment">
      <Field label="Amount" value="0.001 sBTC" />
      <Field label="Transaction" value={<TxLink txid={receipt.payment_txid} />} />
      <Field label="Block" value={<BlockLink height={receipt.block_height} />} />
      <Field label="Timestamp" value={formatDate(receipt.timestamp)} />
    </Section>

    <Section title="Service">
      <Field label="Seller" value={<PrincipalLink principal={receipt.seller_principal} />} />
      <Field label="BNS Name" value={receipt.seller_bns_name} />
      <Field label="Reputation" value={<ReputationScore seller={receipt.seller_principal} />} />
    </Section>

    <Section title="Delivery">
      <Field label="Commitment Hash" value={<Hash hash={receipt.delivery_commitment} />} />
      <Field label="Verified" value={<CheckIcon />} />
      <Field label="Response Size" value="2.3 KB" />
    </Section>

    <Section title="Signature">
      <Field label="Key Version" value={receipt.key_version} />
      <Field label="Signature" value={<SignatureBlock sig={receipt.signature} />} />
      <Field label="Valid" value={<VerificationStatus />} />
    </Section>
  </ReceiptDetails>

  <ReceiptActions>
    <Button onClick={downloadPDF}>Download PDF</Button>
    <Button onClick={downloadJSON}>Download JSON</Button>
    <Button onClick={verifyOnChain}>Verify On-Chain</Button>
    <Button onClick={createDispute} disabled={isExpired}>File Dispute</Button>
    <Button onClick={shareReceipt}>Share Receipt</Button>
  </ReceiptActions>

  <QRCodeSection>
    <QRCode value={`stxact://receipt/${receipt.receipt_id}`} />
    <Caption>Scan to verify receipt</Caption>
  </QRCodeSection>
</ReceiptViewer>
```

### B. **PDF Receipt Generation** (What It Actually Looks Like)

```
┌─────────────────────────────────────────────┐
│                                             │
│              STXACT RECEIPT                 │
│         Verifiable Payment Proof            │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Receipt ID: 7c9e6679-7425-40de-944b...     │
│ Date: January 15, 2025 14:30:22 UTC       │
│                                             │
│ PAYMENT DETAILS                             │
│ ─────────────────────────────────────────  │
│ Amount:      0.001000 sBTC                  │
│ Transaction: 0xabc123def456...              │
│ Block:       #123,456                       │
│ Block Hash:  0x7a8b9c...                    │
│ Confirmed:   6 blocks                       │
│                                             │
│ SERVICE PROVIDER                            │
│ ─────────────────────────────────────────  │
│ Name:        yield-api.btc                  │
│ Principal:   SP2J6ZY48GV1EZ5V2V5RB9M...    │
│ Reputation:  94/100 (247 deliveries)        │
│ Category:    DeFi Oracles                   │
│                                             │
│ DELIVERY VERIFICATION                       │
│ ─────────────────────────────────────────  │
│ Commitment:  b94d27b9934d3e08a52e...        │
│ Verified:    ✓ Yes                          │
│ Delivered:   January 15, 2025 14:30:25     │
│                                             │
│ CRYPTOGRAPHIC PROOF                         │
│ ─────────────────────────────────────────  │
│ Key Version: 1                              │
│ Signature:   MEUCIQD...                     │
│ Status:      ✓ Valid                        │
│                                             │
│ VERIFICATION                                │
│ ─────────────────────────────────────────  │
│ This receipt is cryptographically signed    │
│ by the service provider and anchored to     │
│ the Stacks blockchain at block #123,456.    │
│                                             │
│ Verify online:                              │
│ https://receipts.stxact.io/7c9e6679...      │
│                                             │
│ [QR CODE]                                   │
│                                             │
│ Generated by stxact v1.0.0                  │
│ Powered by Stacks blockchain                │
│                                             │
└─────────────────────────────────────────────┘
```

**PDF Generation Implementation:**

```typescript
// packages/proxy/src/receipts/pdf-generator.ts

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

async function generateReceiptPDF(receipt: Receipt): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4' });
  const buffers: Buffer[] = [];
  
  doc.on('data', buffers.push.bind(buffers));
  
  // Header
  doc.fontSize(24).text('STXACT RECEIPT', { align: 'center' });
  doc.fontSize(12).text('Verifiable Payment Proof', { align: 'center' });
  doc.moveDown(2);
  
  // Receipt ID
  doc.fontSize(10).text(`Receipt ID: ${receipt.receipt_id}`);
  doc.text(`Date: ${new Date(receipt.timestamp * 1000).toUTCString()}`);
  doc.moveDown();
  
  // Payment Details
  doc.fontSize(14).text('PAYMENT DETAILS');
  doc.fontSize(10);
  doc.text(`Amount: ${formatSatsToSBTC(receipt.payment_amount)} sBTC`);
  doc.text(`Transaction: ${receipt.payment_txid}`);
  doc.text(`Block: #${receipt.block_height}`);
  doc.text(`Block Hash: ${receipt.block_hash}`);
  doc.moveDown();
  
  // Service Provider
  doc.fontSize(14).text('SERVICE PROVIDER');
  doc.fontSize(10);
  doc.text(`Name: ${receipt.seller_bns_name || receipt.seller_principal}`);
  doc.text(`Principal: ${receipt.seller_principal}`);
  
  const reputation = await getSellerReputation(receipt.seller_principal);
  doc.text(`Reputation: ${reputation.score}/100 (${reputation.total_deliveries} deliveries)`);
  doc.moveDown();
  
  // Delivery Verification
  if (receipt.delivery_commitment) {
    doc.fontSize(14).text('DELIVERY VERIFICATION');
    doc.fontSize(10);
    doc.text(`Commitment: ${receipt.delivery_commitment}`);
    doc.text('Verified: ✓ Yes');
    doc.moveDown();
  }
  
  // Cryptographic Proof
  doc.fontSize(14).text('CRYPTOGRAPHIC PROOF');
  doc.fontSize(10);
  doc.text(`Key Version: ${receipt.key_version}`);
  doc.text(`Signature: ${receipt.signature.substring(0, 50)}...`);
  
  const isValid = await verifyReceiptSignature(receipt);
  doc.text(`Status: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
  doc.moveDown();
  
  // Verification section
  doc.fontSize(14).text('VERIFICATION');
  doc.fontSize(9);
  doc.text('This receipt is cryptographically signed by the service provider');
  doc.text(`and anchored to the Stacks blockchain at block #${receipt.block_height}.`);
  doc.moveDown();
  
  doc.text('Verify online:');
  doc.fillColor('blue').text(`https://receipts.stxact.io/${receipt.receipt_id}`, {
    link: `https://receipts.stxact.io/${receipt.receipt_id}`,
    underline: true
  });
  doc.fillColor('black');
  doc.moveDown();
  
  // QR Code
  const qrCodeDataURL = await QRCode.toDataURL(
    `stxact://receipt/${receipt.receipt_id}`
  );
  const qrImage = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
  doc.image(qrImage, { width: 150 });
  
  // Footer
  doc.fontSize(8).text('Generated by stxact v1.0.0', { align: 'center' });
  doc.text('Powered by Stacks blockchain', { align: 'center' });
  
  doc.end();
  
  return Buffer.concat(await new Promise(resolve => {
    doc.on('end', () => resolve(buffers));
  }));
}
```

---

## 3️⃣ DEVELOPER INTEGRATION PATHWAYS

### Gap: How does a developer actually integrate stxact into their service?

**Complete Integration Guide:**

### Path A: Backend API Integration

```typescript
// 1. Install stxact server SDK
npm install @stxact/server

// 2. Initialize stxact middleware
import { StxactMiddleware } from '@stxact/server';

const stxact = new StxactMiddleware({
  network: 'testnet',
  sellerPrincipal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  privateKey: process.env.STXACT_PRIVATE_KEY,
  pricing: {
    '/quote': 10000,      // 10k sats
    '/execute': 100000,   // 100k sats
    default: 5000
  },
  config: {
    receiptMode: 'anchored',  // or 'database'
    generatePDF: true,
    webhookURL: process.env.WEBHOOK_URL
  }
});

// 3. Protect routes
app.use('/api', stxact.protect());

app.post('/api/quote', async (req, res) => {
  // stxact middleware has already:
  // - Checked for payment
  // - Verified receipt
  // - Attached req.stxact with payment info
  
  const quote = await generateYieldQuote(req.body);
  
  // Return response - stxact will auto-generate delivery commitment
  res.json(quote);
  
  // After response sent, stxact will:
  // - Hash the response
  // - Update receipt with delivery_commitment
  // - Send webhook notification
  // - Generate PDF if enabled
});

// 4. Handle webhooks
app.post('/webhooks/stxact', stxact.webhookHandler({
  onReceiptGenerated: async (receipt) => {
    // Log to analytics
    await logPayment(receipt);
  },
  onDisputeCreated: async (dispute) => {
    // Alert team
    await notifySupport(dispute);
  },
  onRefundRequested: async (refund) => {
    // Process refund
    await handleRefund(refund);
  }
}));
```

### Path B: Proxy Mode (No Code Changes)

```yaml
# docker-compose.yml
version: '3.8'
services:
  my-api:
    image: my-yield-api:latest
    ports:
      - "3001:3000"
  
  stxact-proxy:
    image: stxact/proxy:latest
    ports:
      - "3000:3000"
    environment:
      - UPSTREAM_URL=http://my-api:3000
      - SELLER_PRINCIPAL=SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
      - PRIVATE_KEY=${STXACT_PRIVATE_KEY}
      - PRICING_DEFAULT=10000
      - RECEIPT_MODE=anchored
    depends_on:
      - my-api
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=stxact
      - POSTGRES_PASSWORD=${DB_PASSWORD}
```

**How it works:**
1. All requests go to stxact-proxy (port 3000)
2. Proxy handles 402 challenges, payment verification, receipts
3. Proxy forwards authenticated requests to upstream (port 3001)
4. Your API doesn't change at all

### Path C: Service Registration Flow

```typescript
// Script to register your service with stxact

import { StxactRegistry } from '@stxact/sdk';

const registry = new StxactRegistry({
  network: 'testnet',
  wallet: sellerWallet
});

await registry.register({
  serviceName: 'yield-api',
  bnsName: 'yield-api.btc',  // Optional
  endpoint: 'https://api.yield-api.com',
  category: 'defi',
  description: 'Real-time DeFi yield quotes',
  pricing: {
    default: 10000,
    '/quote': 10000,
    '/execute': 100000
  },
  stakeBond: '100',  // 100 STX
  policy: {
    maxTimeout: 5000,
    idempotent: true,
    deliveryProof: 'hash',
    refundsSupported: true
  }
});

// Service is now live in directory
```

---

## 4️⃣ WHAT'S ACTUALLY MISSING FROM THE PRD

### Critical Gaps to Add:

#### A. **Receipt Notification System**

```typescript
// How does a buyer know they got a receipt?

// Email Notification
Subject: Receipt for yield-api.btc payment
Body:
  Your payment of 0.001 sBTC has been confirmed.
  
  Receipt ID: 7c9e6679-7425-40de-944b...
  Service: yield-api.btc
  Amount: 0.001 sBTC
  
  View receipt: https://receipts.stxact.io/7c9e6679...
  Download PDF: [Download]
  
  Questions? File a dispute within 24 hours.

// Webhook to Buyer's App
POST https://buyer-app.com/webhooks/stxact
{
  "event": "receipt.created",
  "receipt": {...},
  "downloadURL": "https://receipts.stxact.io/7c9e6679/download"
}

// Push Notification (Browser Extension)
🔔 Receipt generated for yield-api.btc
   0.001 sBTC • View receipt
```

#### B. **Bulk Operations UI**

```
For sellers handling 1000s of receipts:

Dashboard Features:
- Bulk receipt export (all receipts from last month)
- CSV export for accounting
- Aggregate analytics
- Automated refund workflows
- Reputation tracking over time
```

#### C. **Receipt Search & Filtering**

```
receipts.stxact.io/search

Filters:
- Date range
- Seller
- Amount range
- Status (delivered, disputed, refunded)
- Has PDF
- Is anchored

Sort by:
- Date
- Amount
- Reputation
```

#### D. **Mobile Apps**

```
iOS/Android apps for:
- Viewing receipts
- Filing disputes
- Browsing services
- Auto-pay management
- Receipt wallet
```

#### E. **Accounting Integration**

```
Export formats:
- QuickBooks CSV
- Xero CSV
- Wave CSV
- Generic accounting format

Webhook integration:
- Auto-create expenses in accounting software
- Categorize by service type
- Tax reporting support
```

---

## 5️⃣ COMPLETE USER JOURNEY MATRIX

| User Type | Interaction Mode | What They See | What They Get |
|-----------|-----------------|---------------|---------------|
| **Human Buyer (browsing)** | Web UI | Service directory, reputation scores | Service discovery page |
| **Human Buyer (paying)** | Browser extension | 402 payment modal | Receipt saved to extension |
| **Human Buyer (reviewing)** | Web UI | Receipt dashboard | PDF download, dispute button |
| **Developer (integrating)** | SDK | Code snippets, docs | Working integration |
| **Developer (testing)** | CLI | Command output | Local receipts, test mode |
| **DAO Treasury Bot** | SDK | Programmatic API | Verifiable receipts in DB |
| **Seller (registering)** | Web UI | Registration wizard | Listed in directory |
| **Seller (monitoring)** | Web dashboard | Analytics, receipts, disputes | Business insights |
| **Seller (backend)** | Server SDK | Middleware code | Automatic receipt generation |
| **Auditor** | Web UI + API | Historical receipts, on-chain proofs | Exportable audit trail |
| **Accountant** | CSV export | Monthly receipt dumps | QuickBooks-ready CSVs |

---

## 6️⃣ FINAL PRODUCTION REQUIREMENTS DOCUMENT

Add this to your build agent's task list:

### Frontend Deliverables

```
1. Web Application (Next.js/React)
   ├── Public pages
   │   ├── Service directory
   │   ├── Service detail pages
   │   └── Receipt viewer (public receipts)
   ├── Authenticated pages
   │   ├── My receipts dashboard
   │   ├── My disputes
   │   ├── Seller analytics dashboard
   │   └── Service registration
   └── Features
       ├── PDF download
       ├── CSV export
       ├── Dispute filing
       ├── Receipt search
       └── Reputation graphs

2. Browser Extension (Chromium + Firefox)
   ├── 402 payment interceptor
   ├── Auto-pay rules
   ├── Receipt wallet
   └── Spending analytics

3. Mobile Apps (React Native - optional for v2)
   ├── Receipt viewer
   ├── Service browser
   └── Payment approvals
```

### Backend Deliverables

```
4. Receipt Export Service
   ├── PDF generation (pdfkit)
   ├── CSV generation
   ├── Bulk export
   └── Email delivery

5. Notification Service
   ├── Email notifications (SendGrid/Postmark)
   ├── Webhook delivery
   ├── Push notifications
   └── Retry logic

6. Search & Indexing
   ├── Elasticsearch for receipt search
   ├── Full-text search
   ├── Aggregations
   └── Analytics queries
```

### SDK Deliverables

```
7. Client SDKs
   ├── @stxact/sdk (TypeScript - browser + node)
   ├── @stxact/react (React hooks)
   ├── @stxact/server (Express middleware)
   └── @stxact/cli (Commander.js)

8. Integration Templates
   ├── Express.js template
   ├── Next.js template
   ├── Python Flask adapter
   └── Rust adapter (future)
```

---

## 7️⃣ ACTIONABLE NEXT STEPS FOR YOUR BUILD AGENT

Give your agent this updated prompt:

```markdown
# EXTENDED PRODUCTION BUILD - stxact Complete System

In addition to the core protocol implementation, you must build:

## FRONTEND TIER (User-Facing)

1. **Web Application** - receipts.stxact.io
   - Service directory with search/filters
   - Individual service pages with reputation graphs
   - Receipt viewer with PDF download
   - Dispute filing interface
   - Seller dashboard with analytics
   - Buyer receipt management

2. **Browser Extension** - Chrome/Firefox
   - Intercept 402 responses
   - Payment approval modal
   - Auto-pay rule configuration
   - Receipt storage in extension
   - Spending tracker

3. **PDF Generation Service**
   - Compliant receipt formatting
   - QR codes for verification
   - Cryptographic proof section
   - Downloadable PDFs
   - Email delivery

## INTEGRATION TIER (Developer-Facing)

4. **Server SDK** - @stxact/server
   - Express middleware for route protection
   - Auto-receipt generation
   - Webhook handler
   - Pricing configuration

5. **Client SDK** - @stxact/sdk
   - TypeScript SDK for web/node
   - Auto-pay functionality
   - Receipt verification
   - Service discovery

6. **React SDK** - @stxact/react
   - useStxact() hook
   - useReceipts() hook
   - useServiceDirectory() hook
   - Component library

7. **CLI Enhancement**
   - Receipt PDF export
   - Bulk operations
   - Service registration wizard
   - Analytics commands

## INFRASTRUCTURE TIER

8. **Notification System**
   - Email notifications
   - Webhook delivery with retries
   - Push notification support
   - Event bus (Redis pub/sub)

9. **Search & Analytics**
   - Elasticsearch integration
   - Receipt search API
   - Aggregation queries
   - Analytics dashboard

10. **Documentation**
    - Integration guides for each SDK
    - API reference (OpenAPI)
    - Video tutorials
    - Example apps

## VERIFICATION CRITERIA

Each component must have:
- Complete implementation (no TODOs)
- Unit tests (>80% coverage)
- Integration tests
- Documentation
- Example usage
- Deployment instructions

The user should be able to:
- Browse services without coding
- Pay for services via browser
- Download receipts as PDF
- File disputes via UI
- Integrate via 3 lines of code (SDK)
- Deploy via Docker Compose
- Monitor via dashboard
- Export for accounting
- Verify receipts offline
```

This gives your build agent the COMPLETE picture of what needs to be built beyond the protocol layer.