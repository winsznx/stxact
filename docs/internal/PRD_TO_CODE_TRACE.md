# PRD-to-Code Trace: Brutal Gap Analysis

**Date:** 2026-02-14
**PRD Status:** Draft for Implementation
**Code Status:** Partial Implementation

---

## Route Tree: Payment Protection Status

### Payment-Protected Routes (x402)
| Route | Method | Middleware | Status |
|-------|--------|------------|--------|
| `/demo/premium-data` | GET | x402-stacks → receipt | ✅ IMPLEMENTED |
| `/demo/ai-inference` | POST | x402-stacks → receipt | ✅ IMPLEMENTED |

### Free Routes (No Payment Required)
| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/receipts/verify` | POST | Receipt verification | ✅ IMPLEMENTED |
| `/receipts/:receipt_id` | GET | Receipt lookup | ✅ IMPLEMENTED |
| `/directory/services` | GET | Service discovery | ✅ IMPLEMENTED |
| `/directory/register` | POST | Service registration | ✅ IMPLEMENTED |
| `/disputes` | POST | Dispute creation | ✅ IMPLEMENTED |
| `/disputes/:dispute_id` | GET | Dispute lookup | ✅ IMPLEMENTED |
| `/disputes/refunds` | POST | Refund authorization | ✅ IMPLEMENTED |
| `/health` | GET | Health check | ✅ IMPLEMENTED |
| `/.well-known/stxact-config` | GET | Service capabilities | ✅ IMPLEMENTED |

---

## On-Chain Contract Interaction Points

### Implemented Contract Calls

**1. Reputation Update (Fire-and-Forget)**
- **File:** `src/middleware/generate-receipt.ts:194-318`
- **Contract:** `reputation-map.clar::record-successful-delivery`
- **When:** After successful receipt generation
- **Status:** ✅ IMPLEMENTED
- **Nonce Management:** ✅ Thread-safe with mutex locking

**2. BNS Resolution (Read-Only)**
- **File:** `src/identity/bns.ts:105-124`
- **Contract:** `SP000000000000000000002Q6VF78.bns::name-resolve`
- **When:** Service registration, ownership verification
- **Status:** ✅ IMPLEMENTED
- **Caching:** ✅ 1-hour TTL

**3. Key Version Lookup (Read-Only)**
- **File:** `src/crypto/signatures.ts:107-128`
- **Contract:** `reputation-map.clar::get-signing-key-version` (optional)
- **When:** Receipt signature verification (optional flag)
- **Status:** ✅ IMPLEMENTED

### Missing Contract Calls

**1. Dispute Contract Interaction**
- **Expected Contract:** `dispute-resolver.clar::execute-refund`
- **PRD Reference:** Section 11 (Dispute Resolution)
- **Current Status:** ❌ NOT CALLED
- **Gap:** Refund authorization is stored in DB but never executed on-chain
- **Evidence:** `src/api/disputes.ts` only stores in `refund_authorizations` table

**2. Service Registry Interaction**
- **Expected Contract:** `service-registry.clar::register-service`
- **PRD Reference:** Section 10 (Service Registry)
- **Current Status:** ❌ NOT CALLED
- **Gap:** Service registration only stores in PostgreSQL, not on-chain
- **Evidence:** `src/api/directory.ts:191-216` only does `INSERT INTO services`

**3. Receipt Anchoring**
- **Expected Contract:** `receipt-anchor.clar::anchor-receipt-batch`
- **PRD Reference:** Section 8 (Optional Receipt Anchoring)
- **Current Status:** ❌ NOT IMPLEMENTED
- **Gap:** No anchoring implementation at all
- **Evidence:** Flagged by `process.env.ENABLE_RECEIPT_ANCHORING === 'true'` but not implemented

---

## PRD Acceptance Criteria Trace

### ✅ Flow 1: Unpaid Request → 402 Challenge

**PRD Requirement:**
> Client requests endpoint without payment → Server returns 402 with PAYMENT-REQUIRED header

**PRD Spec (OUTDATED):**
```
Header: PAYMENT-REQUIRED (uppercase)
```

**Actual Implementation:**
```typescript
// src/middleware/x402-payment-gate.ts
// Uses x402-stacks library which returns:
// Header: payment-required (lowercase v2)
```

**Status:** ✅ IMPLEMENTED (but PRD header spec is outdated)

**PRD Fix Needed:**
```diff
- PAYMENT-REQUIRED header
+ payment-required header (x402 v2 lowercase)
```

---

### ✅ Flow 2: Payment Signature Verification

**PRD Requirement:**
> Client retries with PAYMENT-SIGNATURE header → Facilitator verifies → Server checks binding

**PRD Spec (OUTDATED):**
```
Header: PAYMENT-SIGNATURE (uppercase)
```

**Actual Implementation:**
```typescript
// src/middleware/x402-payment-gate.ts
// Uses x402-stacks library which expects:
// Header: payment-signature (lowercase v2)
```

**Status:** ✅ IMPLEMENTED (but PRD header spec is outdated)

**PRD Fix Needed:**
```diff
- PAYMENT-SIGNATURE header
+ payment-signature header (x402 v2 lowercase)
```

---

### ✅ Flow 3: Payment Binding Check

**PRD Requirement:**
> Verify payment txid is not already bound to different request

**Actual Implementation:**
```typescript
// src/crypto/payment-binding.ts:14-38
export async function verifyPaymentBinding(
  paymentTxid: string,
  requestHash: string
): Promise<void>

// src/middleware/x402-payment-gate.ts:127
await verifyPaymentBinding(paymentTxid, requestHash);
```

**Database:**
```sql
-- infra/migrations/004_create_used_payments.sql
CREATE TABLE used_payments (
  payment_txid TEXT PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- NO TTL, NO EXPIRATION
);
```

**Status:** ✅ IMPLEMENTED
**Storage:** ✅ Permanent (no TTL)

---

### ✅ Flow 4: Receipt Generation

**PRD Requirement:**
> Generate cryptographic receipt with seller signature over 13 canonical fields

**Actual Implementation:**
```typescript
// src/crypto/receipt-canonical.ts:11-82
export function generateReceiptCanonicalMessage(receipt): string

// src/crypto/signatures.ts:27-40
export function signReceipt(receipt, privateKey): string

// src/middleware/generate-receipt.ts:54-145
async function generateReceiptMiddleware(req, res, next)
```

**Status:** ✅ IMPLEMENTED
**Signature:** ✅ ECDSA with Stacks private key
**Fields:** ✅ 13 canonical fields (receipt_id, request_hash, payment_txid, etc.)

---

### ✅ Flow 5: Reputation Update (Fire-and-Forget)

**PRD Requirement:**
> Update on-chain reputation after successful delivery (async, non-blocking)

**Actual Implementation:**
```typescript
// src/middleware/generate-receipt.ts:194-318
async function updateReputationAsync(
  sellerPrincipal: string,
  receiptId: string,
  paymentAmountSats: string
): Promise<void>

// Contract call:
makeContractCall({
  contractAddress: address,
  contractName,
  functionName: 'record-successful-delivery',
  functionArgs: [
    principalCV(sellerPrincipal),
    bufferCVFromString(receiptHash),
    uintCV(parseInt(paymentAmountSats, 10)),
  ],
  // ...
});
```

**Status:** ✅ IMPLEMENTED
**Pattern:** ✅ Fire-and-forget (errors logged, don't block)
**Nonce Management:** ✅ Thread-safe with mutex

---

### ❌ Flow 6: Dispute Creation → Resolution → Refund

**PRD Requirement:**
> Buyer creates dispute → Seller authorizes refund → Execute on-chain via tx-sender

**Actual Implementation:**

**Dispute Creation:** ✅ IMPLEMENTED
```typescript
// src/api/disputes.ts:14-97
router.post('/', async (req, res) => {
  // Creates dispute in PostgreSQL
  const insertQuery = `INSERT INTO disputes (...)`;
});
```

**Refund Authorization:** ✅ IMPLEMENTED (Database Only)
```typescript
// src/api/disputes.ts:99-252
router.post('/refunds', async (req, res) => {
  // Verifies seller signature
  const recoveredPrincipal = verifyRefundAuthorization(refund);

  // Stores in database
  const insertAuthQuery = `INSERT INTO refund_authorizations (...)`;
});
```

**Refund Execution:** ❌ NOT IMPLEMENTED
```typescript
// Expected: Call dispute-resolver.clar::execute-refund
// Actual: NO CONTRACT CALL FOUND
```

**Status:** ⚠️ PARTIAL
- Dispute creation: ✅
- Refund authorization signature: ✅
- Database persistence: ✅
- **ON-CHAIN EXECUTION: ❌ MISSING**

**Gap:** `src/api/disputes.ts` stores refund authorization but never calls the Clarity contract.

**Required Implementation:**
```typescript
// Need to add:
const { makeContractCall } = await import('@stacks/transactions');

const refundTx = await makeContractCall({
  contractAddress: process.env.DISPUTE_RESOLVER_ADDRESS!.split('.')[0],
  contractName: process.env.DISPUTE_RESOLVER_ADDRESS!.split('.')[1],
  functionName: 'execute-refund',
  functionArgs: [
    bufferCVFromString(dispute_id),
    uintCV(refund_amount),
    principalCV(buyer_principal),
  ],
  senderKey: sellerPrivateKey, // tx-sender must be seller
  network,
});

await broadcastTransaction(refundTx, network);
```

---

### ❌ Flow 7: Service Registration (On-Chain)

**PRD Requirement (Section 10):**
> Services register on-chain via service-registry.clar::register-service

**Actual Implementation:**

**Database Registration:** ✅ IMPLEMENTED
```typescript
// src/api/directory.ts:125-239
router.post('/register', async (req, res) => {
  // Stores in PostgreSQL
  const insertQuery = `INSERT INTO services (...)`;
});
```

**On-Chain Registration:** ❌ NOT IMPLEMENTED

**Status:** ❌ GAP
**Evidence:** No `makeContractCall` to `service-registry.clar`

**Required Implementation:**
```typescript
// Need to add:
const registrationTx = await makeContractCall({
  contractAddress: process.env.SERVICE_REGISTRY_ADDRESS!.split('.')[0],
  contractName: process.env.SERVICE_REGISTRY_ADDRESS!.split('.')[1],
  functionName: 'register-service',
  functionArgs: [
    stringAsciiCV(endpoint_url),
    bufferCVFromString(policy_hash),
    // ... other args per contract
  ],
  senderKey: sellerPrivateKey,
  network,
});
```

---

### ❌ Flow 8: Receipt Anchoring (Institutional-Grade)

**PRD Requirement (Section 8, lines 1101-1184):**
> Optional on-chain anchoring for institutional-grade trust

**Actual Implementation:** ❌ NOT IMPLEMENTED

**Evidence:**
```typescript
// src/index.ts:176
receipt_anchoring: process.env.ENABLE_RECEIPT_ANCHORING === 'true'
// Flag exists but no implementation found
```

**Status:** ❌ GAP

**Required Implementation:**
```typescript
// Need to add:
async function anchorReceiptBatch(receipts: string[]): Promise<string> {
  const merkleRoot = computeMerkleRoot(receipts);

  const anchorTx = await makeContractCall({
    contractAddress: process.env.RECEIPT_ANCHOR_ADDRESS!.split('.')[0],
    contractName: process.env.RECEIPT_ANCHOR_ADDRESS!.split('.')[1],
    functionName: 'anchor-receipt-batch',
    functionArgs: [
      bufferCVFromString(merkleRoot),
      uintCV(receipts.length),
    ],
    senderKey: anchorKey,
    network,
  });

  return broadcastTransaction(anchorTx, network);
}
```

---

### ❌ Non-Functional Requirements: Reliability

**PRD Requirement (Section 15):**
> PostgreSQL replication, automated backups, monitoring, SLA

**Actual Implementation:**

**Connection Pooling:** ✅ IMPLEMENTED
```typescript
// src/storage/db.ts:14-23
const poolConfig: PoolConfig = {
  max: 20, // Max connections per PRD
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};
```

**Replication:** ❌ NOT CONFIGURED
**Backups:** ❌ NOT AUTOMATED
**Monitoring:** ❌ NOT IMPLEMENTED
**SLA Metrics:** ❌ NOT TRACKED

**Status:** ❌ GAP

---

### ❌ Non-Functional Requirements: Security Audit

**PRD Requirement (Section 14, Acceptance Criteria):**
> External security audit before mainnet

**Status:** ❌ NOT DONE

---

## Summary: Implementation vs PRD

### ✅ Implemented (Core Payment Flow)

1. **x402 Protocol Integration** - x402-stacks library with v2 headers
2. **Payment Binding** - Permanent storage, replay protection
3. **Receipt Generation** - 13-field canonical message + signature
4. **Reputation Update** - Fire-and-forget on-chain update
5. **BNS Verification** - Read-only contract calls with caching
6. **Dispute Creation** - Database storage
7. **Refund Authorization** - Signature verification + storage
8. **Service Directory** - PostgreSQL-based listing

### ❌ Missing (Production-Ready Gaps)

1. **Refund Execution** - No on-chain dispute-resolver.clar call
2. **Service Registration** - No on-chain service-registry.clar call
3. **Receipt Anchoring** - Not implemented (institutional requirement)
4. **PostgreSQL Replication** - Not configured
5. **Automated Backups** - Not implemented
6. **Monitoring/SLA** - Not tracked
7. **Security Audit** - Not done
8. **Load Testing** - Not done (100+ concurrent required)
9. **Integration Tests** - Not written (full flow end-to-end)

### 📝 PRD Updates Needed (Outdated Specs)

**Section 6: Payment Protocol Headers**
```diff
- PAYMENT-REQUIRED header (uppercase)
- PAYMENT-SIGNATURE header (uppercase)
+ payment-required header (lowercase, x402 v2)
+ payment-signature header (lowercase, x402 v2)
+ payment-response header (lowercase, x402 v2)
```

**Section 6: Network Identifiers**
```diff
+ Add CAIP-2 network identifier spec:
+ - Mainnet: stacks:1
+ - Testnet: stacks:2147483648
```

**Section 6: x402 Library Integration**
```diff
+ Add library specification:
+ - Library: x402-stacks v2.0.1 (Coinbase-compatible)
+ - Facilitator: https://facilitator.stacksx402.com
+ - Protocol: x402 v2
```

---

## What Can Be Claimed

### ✅ Accurate Claims

1. **"x402 integration is complete"** - x402-stacks library is integrated and working in /demo
2. **"Build passes without errors"** - TypeScript compiles cleanly
3. **"Core payment flow works"** - 402 → payment → receipt → reputation
4. **"Payment binding prevents replay"** - Permanent storage, tested
5. **"Receipts are cryptographically signed"** - ECDSA signatures work

### ❌ Cannot Claim (Yet)

1. ~~"Production-ready"~~ - Missing reliability requirements
2. ~~"Full dispute resolution"~~ - Refund execution not implemented
3. ~~"Service registry complete"~~ - No on-chain registration
4. ~~"Institutional-grade"~~ - Receipt anchoring not implemented
5. ~~"PRD acceptance criteria met"~~ - See gaps above

---

## Next Steps to Reach "Production-Ready"

### High Priority (Blocking)

1. **Implement Refund Execution**
   - File: `src/api/disputes.ts`
   - Add: `makeContractCall` to `dispute-resolver.clar::execute-refund`
   - Test: End-to-end dispute → refund flow

2. **Implement Service Registration (On-Chain)**
   - File: `src/api/directory.ts`
   - Add: `makeContractCall` to `service-registry.clar::register-service`
   - Test: Registration persists on-chain

3. **Update PRD Header Specs**
   - Fix: Section 6 (lowercase v2 headers)
   - Add: CAIP-2 network identifiers
   - Add: x402-stacks library spec

### Medium Priority

4. **Implement Receipt Anchoring**
   - File: Create `src/blockchain/receipt-anchor.ts`
   - Add: Merkle root computation + batch anchoring
   - Test: Anchored receipts verifiable on-chain

5. **Integration Tests**
   - File: Create `packages/proxy/tests/integration/`
   - Test: Full x402 flow with real facilitator
   - Test: Dispute → refund execution
   - Test: Service registration + directory lookup

### Low Priority

6. **PostgreSQL Replication** - DevOps configuration
7. **Automated Backups** - Infrastructure setup
8. **Monitoring/SLA** - Observability stack
9. **Security Audit** - External audit firm
10. **Load Testing** - 100+ concurrent requests

---

## Verdict

**Current Status:** "Build-clean + x402 integrated + core flow working"

**NOT Yet:** "Production-ready per PRD acceptance criteria"

**To Claim Production-Ready:** Complete High Priority items + PRD updates + testing
