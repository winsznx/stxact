# Critical Verification Required Before Production

## 1. Signature Hash Encoding (PRIORITY: HIGH)

**Issue**: Potential mismatch between hash encoding in signature verification.

**Current Implementation**:
```typescript
// In signRefundAuthorization() and verifyRefundAuthorization()
const msgHash = createHash('sha256').update(canonicalMsg).digest('hex');

const signature = signMessageHashRsv({
  messageHash: msgHash,  // ← Is this correct?
  privateKey,
});
```

**Question**: Does `signMessageHashRsv` from `@stacks/encryption` expect:
- A) Hex string (e.g., "a7f3d2c9...")
- B) Raw Buffer
- C) Hex string with "0x" prefix

**What We're Passing**: Hex string without "0x" prefix

**Verification Required**:
1. Check @stacks/encryption source code or documentation
2. Write test that:
   - Signs a message
   - Verifies signature
   - Confirms public key recovery matches signer
3. Test with known test vectors from Stacks

**Test File**: `packages/proxy/tests/unit/signatures.test.ts`

**Test Case**:
```typescript
test('signRefundAuthorization and verifyRefundAuthorization round-trip', () => {
  const privateKey = '...'; // Test key
  const refund = {
    dispute_id: 'test-dispute-id',
    receipt_id: 'test-receipt-id',
    refund_amount: '10000',
    buyer_principal: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE',
    seller_principal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    timestamp: 1735699200,
  };

  const signature = signRefundAuthorization(refund, privateKey);
  const refundWithSig = { ...refund, signature };
  const recoveredPrincipal = verifyRefundAuthorization(refundWithSig);

  expect(recoveredPrincipal).toBe(refund.seller_principal);
});
```

**Resolution**: Test must pass before production deployment.

---

## 2. Nonce Manager Under Load (PRIORITY: HIGH)

**Issue**: Nonce manager is in-memory only. Under high concurrency or server restart, nonces may drift.

**Current Implementation**:
- In-memory Map<address, NonceState>
- Periodic resync every 30 seconds
- Lock-based concurrency control

**Edge Cases to Test**:

### A) Concurrent Reputation Updates
```typescript
test('nonce manager handles 100 concurrent allocations', async () => {
  const promises = Array.from({ length: 100 }, () =>
    nonceManager.allocateNonce(testAddress)
  );
  const nonces = await Promise.all(promises);

  // All nonces must be unique
  const uniqueNonces = new Set(nonces.map(n => n.toString()));
  expect(uniqueNonces.size).toBe(100);

  // Nonces must be sequential
  const sorted = nonces.map(n => Number(n)).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    expect(sorted[i]).toBe(sorted[i - 1] + 1);
  }
});
```

### B) Server Restart
- Nonce state is lost on restart
- First request after restart must resync from blockchain
- Test: Restart server mid-transaction, verify recovery

### C) External Transactions
- Someone else submits transaction from same address
- On-chain nonce increments externally
- Nonce manager must detect drift on next sync
- Test: Simulate external transaction, verify drift detection

**Resolution**: All concurrent tests must pass. Consider Redis-backed nonce storage for multi-server deployment.

---

## 3. Payment Binding TTL (PRIORITY: CRITICAL)

**Issue**: Verify that `used_payments` table has NO TTL or automatic expiration.

**Current Implementation**:
```sql
CREATE TABLE used_payments (
  payment_txid TEXT PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Verification Required**:
1. Check for any cron jobs that delete old entries
2. Check for any TTL/expiration policies in PostgreSQL
3. Verify no application-level cleanup logic exists
4. Confirm this is "Option B: Permanent Tracking" from PRD

**If TTL Exists**: This reopens replay attack window. MUST be removed.

**Test**:
```typescript
test('payment binding never expires', async () => {
  const oldPaymentTxid = 'ancient-txid-from-90-days-ago';
  const requestHash = 'test-request-hash';

  // Store binding
  await verifyPaymentBinding(oldPaymentTxid, requestHash);

  // Simulate 90 days passing (or query old test data)
  // ...

  // Attempt to reuse payment
  await expect(
    verifyPaymentBinding(oldPaymentTxid, 'different-request-hash')
  ).rejects.toThrow('already used for different request');
});
```

**Resolution**: Confirm permanent storage with no expiration.

---

## 4. Refund Authorization Replay Protection (PRIORITY: MEDIUM)

**Issue**: Refund authorization timestamps are advisory only. No on-chain enforcement of expiration.

**Current Implementation**:
- TypeScript validates `timestamp` is recent (within 24 hours)
- Clarity contract does NOT check timestamp
- Seller can submit old authorization if they kept it

**Potential Attack**:
1. Seller signs refund authorization for Dispute A
2. Dispute A is resolved
3. Buyer creates Dispute B for same receipt (if possible)
4. Seller reuses old authorization signature for Dispute B?

**Mitigations Already in Place**:
- `dispute_id` is in canonical message (binds to specific dispute)
- Clarity contract checks `tx-sender == seller` (must be seller submitting)
- Dispute must be in "open" or "acknowledged" state

**Verification Required**:
Test that old refund authorization cannot be replayed:
```typescript
test('refund authorization cannot be replayed for different dispute', async () => {
  const auth1 = signRefundAuthorization({ dispute_id: 'dispute-1', ... }, privateKey);

  // Attempt to use auth1 for dispute-2
  const auth2 = { ...auth1, dispute_id: 'dispute-2' };

  const recovered = verifyRefundAuthorization(auth2);
  expect(recovered).toBeNull(); // Signature won't match
});
```

**Resolution**: Verify signature verification fails on dispute_id mismatch.

---

## 5. Transaction Confirmation Monitoring (PRIORITY: MEDIUM)

**Issue**: Reputation updates broadcast transactions but don't monitor confirmation.

**Missing**:
- No polling for transaction confirmation
- No reorg detection
- No dropped mempool transaction detection
- No automatic retry on failure

**Current Behavior**:
```typescript
const broadcastResponse = await broadcastTransaction(transaction, network);
logger.info('Reputation update transaction broadcast', { tx_id: broadcastResponse.txid });
// ← Transaction may never confirm, we don't know
```

**Production Requirements**:
1. Poll transaction status every 10 seconds for 5 minutes
2. If confirmed: Mark as complete
3. If dropped: Retry with same nonce
4. If reorg: Detect and re-broadcast
5. After 5 minutes: Log error, alert monitoring

**Implementation Stub**:
```typescript
async function monitorTransaction(txid: string, maxWaitMs: number): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const status = await fetchTransactionStatus(txid);
    if (status === 'success') return true;
    if (status === 'failed') return false;
    await sleep(10000); // 10 seconds
  }
  return false; // Timeout
}
```

**Resolution**: Implement for production. For hackathon: log warning that monitoring is not implemented.

---

## 6. Zod Validation on API Endpoints (PRIORITY: MEDIUM)

**Issue**: No request validation on API endpoints. Malformed input can crash server or cause undefined behavior.

**Current State**:
```typescript
router.post('/disputes', async (req: Request, res: Response) => {
  const { receipt_id, reason, evidence, buyer_signature } = req.body;

  if (!receipt_id || !reason) {  // ← Manual validation only
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  // ...
});
```

**Required**:
```typescript
import { z } from 'zod';

const CreateDisputeSchema = z.object({
  receipt_id: z.string().uuid(),
  reason: z.enum(['delivery_hash_mismatch', 'no_response', 'incomplete_delivery', 'fraudulent_quote']),
  evidence: z.object({
    expected_hash: z.string().optional(),
    received_hash: z.string().optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
  buyer_signature: z.string().optional(),
});

router.post('/disputes', async (req: Request, res: Response) => {
  const parsed = CreateDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error });
    return;
  }
  const { receipt_id, reason, evidence, buyer_signature } = parsed.data;
  // ...
});
```

**Resolution**: Add Zod schemas to all API endpoints before production.

---

## 7. Architectural Shift Documentation (PRIORITY: LOW)

**Issue**: PRD may describe on-chain refund signature verification that is no longer implemented.

**Change Made**:
- **Before**: On-chain ECDSA verification of canonical refund message
- **After**: Off-chain signature verification + on-chain tx-sender verification

**PRD Sections to Update**:
- Section 11 (lines 1596-1661): execute-refund function description
- Should clarify that canonical message is for audit trail, not protocol enforcement
- tx-sender is the cryptographic enforcement mechanism

**Resolution**: Update PRD or add ARCHITECTURE.md documenting design decisions.

---

## Summary of Actions Required

| Item | Priority | Effort | Blocker? |
|------|----------|--------|----------|
| 1. Signature hash encoding test | HIGH | 1 hour | ❌ No (likely works, needs verification) |
| 2. Nonce manager load test | HIGH | 2 hours | ✅ YES (will break under load) |
| 3. Payment binding TTL check | CRITICAL | 15 min | ✅ YES (replay risk) |
| 4. Refund auth replay test | MEDIUM | 1 hour | ❌ No (likely protected) |
| 5. Transaction monitoring | MEDIUM | 4 hours | ❌ No (fire-and-forget acceptable for hackathon) |
| 6. Zod validation | MEDIUM | 3 hours | ❌ No (manual validation exists) |
| 7. PRD update | LOW | 30 min | ❌ No (documentation clarity) |

**Before Production**: Items 1, 2, 3 MUST be resolved.
**Before Hackathon Demo**: Item 2 SHOULD be tested, Item 3 MUST be verified.
**Nice to Have**: Items 4, 5, 6, 7 improve robustness but not critical for demo.

---

**This document identifies the remaining concurrency and security verification gaps.**
**All items marked "Blocker? YES" must be resolved before any production deployment.**
