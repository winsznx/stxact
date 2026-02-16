# PRD Section: x402 Protocol Integration

**Add this to PRD Section 6 (Payment Protocol)**

---

## 6.1 x402 Protocol Compliance

### Implementation Target

**Library:** `x402-stacks` v2.0.1 (Coinbase-compatible)
**Facilitator:** `https://facilitator.stacksx402.com` (official)
**Protocol Version:** x402 v2

### Standard x402 Behavior

stxact uses the official x402-stacks library for HTTP-level payment protocol:

**Headers (lowercase v2 format):**
- `payment-required` - Server → Client (402 response)
- `payment-signature` - Client → Server (retry with payment)
- `payment-response` - Server → Client (settlement confirmation)

**Network Identifiers (CAIP-2):**
- Mainnet: `stacks:1`
- Testnet: `stacks:2147483648`

**Flow:**
1. Client requests protected resource
2. Server responds 402 with `payment-required` header
3. Client signs STX transaction (does NOT broadcast)
4. Client retries with `payment-signature` header
5. Server sends to facilitator for settlement
6. Facilitator broadcasts + waits for confirmation
7. Server responds 200 with `payment-response` header

### stxact-Specific Invariants (Layered on Top)

The x402 library handles standard payment verification. stxact adds these requirements **after** payment succeeds:

#### 1. Payment Binding (Replay Protection)
- **Invariant:** One payment transaction can only be used for ONE specific request
- **Storage:** Permanent (no TTL) - prevents future replay attacks
- **Implementation:** `verifyPaymentBinding(payment_txid, request_hash)`
- **Database:** `used_payments` table with no expiration
- **PRD Reference:** Section 8 (Option B - Permanent Tracking)

#### 2. Request Hash (Idempotency)
- **Invariant:** Same request within 5-minute window returns cached response
- **Computation:** SHA-256 over (method, path, body, timestamp_bucket, idempotency_key)
- **Bucketing:** 5-minute windows to allow clock skew
- **Implementation:** `computeRequestHash(...)` + `checkIdempotency(...)`

#### 3. Cryptographic Receipts
- **Invariant:** Every successful paid request generates a signed receipt
- **Signature:** Seller's ECDSA signature over 13 canonical fields
- **Verification:** Off-chain signature verification + on-chain key-version lookup (optional)
- **Storage:** Permanent in `receipts` table
- **PRD Reference:** Section 8 (Receipt Canonical Message)

#### 4. Reputation Updates (Fire-and-Forget)
- **Invariant:** Successful deliveries update on-chain reputation
- **Pattern:** Async, non-blocking (errors logged but don't fail request)
- **Contract:** `reputation-map.clar::record-successful-delivery`
- **Nonce Management:** Thread-safe atomic allocation with mutex locking
- **PRD Reference:** Section 12 (Reputation System)

#### 5. Dispute Resolution (tx-sender Enforced)
- **Invariant:** Refunds use Clarity native identity verification (tx-sender)
- **Authorization:** Off-chain signature for audit trail
- **Execution:** On-chain via `dispute-resolver.clar::execute-refund`
- **Verification:** Seller must be tx-sender (blockchain-enforced)
- **PRD Reference:** Section 11 (Dispute Resolution)

### Middleware Stack

**Protected Endpoint Pattern:**
```typescript
router.get('/endpoint',
  createX402PaymentGate({...}),      // ← x402-stacks library (standard protocol)
  generateReceiptMiddleware,          // ← stxact receipt generation
  handler                             // ← business logic
);
```

**Execution Order:**
1. **x402-stacks paymentMiddleware** - Standard payment verification
2. **stxact verifyPaymentBinding** - Replay protection
3. **stxact checkIdempotency** - Return cached response if duplicate
4. **Business logic** - Execute actual service
5. **stxact generateReceipt** - Sign and store receipt
6. **stxact updateReputation** - Fire-and-forget on-chain update

### Configuration

**Environment Variables:**
```bash
# x402 Standard
X402_FACILITATOR_URL=https://facilitator.stacksx402.com
STACKS_NETWORK=testnet|mainnet
STACKS_API_URL=https://api.testnet.hiro.so

# stxact Layer
SERVICE_PRINCIPAL=ST...              # Payment recipient
SELLER_PRIVATE_KEY=...               # Receipt signing key
REPUTATION_MAP_ADDRESS=ST...reputation-map
DISPUTE_RESOLVER_ADDRESS=ST...dispute-resolver
```

### Compliance Verification

**Test that x402 protocol is correct:**
1. Unpaid request returns 402 with `payment-required` header (lowercase)
2. Payment header is base64-encoded with x402Version: 2
3. Network identifier uses CAIP-2 format (stacks:1 or stacks:2147483648)
4. Facilitator settlement returns `payment-response` header
5. All headers are lowercase (v2 spec)

**Test that stxact invariants hold:**
1. Same payment txid cannot be replayed for different request
2. Same request within 5min returns cached response
3. Every successful response includes X-stxact-Receipt header
4. Reputation update fires asynchronously (non-blocking)
5. Refund execution requires tx-sender == seller

### Non-Goals

**What x402-stacks handles (we don't re-implement):**
- HTTP 402 response generation
- Payment signature verification
- Facilitator communication (POST /verify, POST /settle)
- Transaction broadcasting
- Blockchain confirmation polling

**What stxact adds:**
- Request-specific replay protection (payment binding)
- Cryptographic delivery receipts
- On-chain reputation tracking
- Dispute resolution protocol
- Service discovery (BNS integration)

### Migration Notes

**Old custom x402 implementation (DEPRECATED):**
- Files: `x402-challenge.ts`, `verify-payment.ts`
- Headers: `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE` (uppercase)
- Status: Dead code (not imported in any routes)

**New official implementation:**
- Library: x402-stacks v2.0.1
- File: `x402-payment-gate.ts`
- Headers: `payment-required`, `payment-signature`, `payment-response` (lowercase)
- Status: Active in /demo endpoints

---

## References

- x402-stacks Documentation: https://docs.x402stacks.xyz/
- x402-stacks GitHub: https://github.com/tony1908/x402Stacks
- Coinbase x402 Spec: https://github.com/coinbase/x402
- Official Facilitator: https://facilitator.stacksx402.com
- CAIP-2 Spec: https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
