# stxact Test Plan

**Status**: Planning Phase
**Target Coverage**: >80%
**Current Coverage**: ~5% (2 Clarity test files only)

## Test Strategy

### Test Pyramid

```
       /\
      /E2E\          <- 10% (End-to-end flows)
     /------\
    /Integr.\       <- 30% (API + Blockchain)
   /----------\
  /Unit Tests \    <- 60% (Functions, Components)
 /--------------\
```

## Unit Tests

### Crypto Module (`packages/proxy/src/crypto/`)

**File: canonicalize.test.ts**
- [ ] Canonical JSON: nested objects with keys in random order → deterministic output
- [ ] Canonical JSON: arrays preserve order
- [ ] Canonical JSON: null, undefined, empty values handled correctly
- [ ] Canonical JSON: special characters in strings preserved

**File: signatures.test.ts**
- [ ] signReceipt: signature verifiable with public key
- [ ] signReceipt: same receipt → same signature (deterministic)
- [ ] verifyReceipt: valid signature → returns true
- [ ] verifyReceipt: modified receipt after signing → returns false
- [ ] verifyReceipt: wrong public key → returns false
- [ ] signRefundAuthorization: canonical message correct
- [ ] verifyRefundAuthorization: valid signature → returns seller principal
- [ ] verifyRefundAuthorization: invalid signature → returns null

**File: request-hash.test.ts**
- [ ] computeRequestHash: deterministic for same inputs
- [ ] computeRequestHash: timestamp bucketing (same bucket → same hash)
- [ ] computeRequestHash: different bucket → different hash
- [ ] computeRequestHash: method case-insensitive
- [ ] computeRequestHash: path normalized

**File: payment-binding.test.ts**
- [ ] verifyPaymentBinding: first use → stores mapping
- [ ] verifyPaymentBinding: same payment + request → succeeds
- [ ] verifyPaymentBinding: same payment + different request → throws error
- [ ] verifyPaymentBinding: check permanent storage (no expiration)

**File: deliverable-hash.test.ts**
- [ ] computeDeliverableHash: JSON with sorted keys → deterministic
- [ ] computeDeliverableHash: binary data (Buffer) → SHA-256 hex
- [ ] computeDeliverableHash: empty object → correct hash
- [ ] computeDeliverableHash: nested arrays and objects

### Middleware Module (`packages/proxy/src/middleware/`)

**File: x402-challenge.test.ts**
- [ ] No PAYMENT-SIGNATURE header → 402 response
- [ ] 402 response includes PAYMENT-REQUIRED header
- [ ] 402 response includes request hash
- [ ] Rate limiter: 101st unpaid request in 1 min → 429
- [ ] Rate limiter: paid requests don't count toward limit
- [ ] PAYMENT-SIGNATURE present → calls next()

**File: verify-payment.test.ts**
- [ ] Valid payment from facilitator → proceeds
- [ ] Facilitator down → falls back to on-chain
- [ ] On-chain: insufficient confirmations → 422
- [ ] On-chain: transaction not found → 422
- [ ] Payment amount < required → 422
- [ ] Payment binding check fails → 409
- [ ] Idempotency cache hit → returns cached response

**File: generate-receipt.test.ts**
- [ ] Receipt generated with all 13 core fields
- [ ] Receipt signature valid
- [ ] Receipt stored in database
- [ ] Reputation update called asynchronously
- [ ] Response includes X-stxact-Receipt-ID header
- [ ] Idempotency cache stores response

### Clarity Contracts (`packages/contracts/tests/`)

**File: service-registry_test.ts**
- [x] Register service with valid stake → succeeds
- [x] Register with insufficient stake → ERR-422
- [ ] Register twice → ERR-409 (conflict)
- [ ] Update service policy hash → succeeds
- [ ] Deactivate service → active = false
- [ ] Withdraw stake after deactivation → succeeds
- [ ] Withdraw stake while active → fails

**File: reputation-map_test.ts**
- [x] Record successful delivery → increments score
- [x] Logarithmic scoring: 10k sats → +14
- [x] Logarithmic scoring: 100k sats → +17
- [x] Logarithmic scoring: 1M sats → +20
- [x] Logarithmic scoring: ≥1,048,576 sats → capped at +21
- [x] Double-count protection: same receipt hash → ERR-409
- [x] Minimum payment: <10k sats → ERR-422
- [ ] Record dispute resolved (refund) → score penalty -2
- [ ] Record dispute unresolved → score penalty -5
- [ ] Rotate signing key → key version increments
- [ ] Historical key verification (receipts signed with old key still valid)

**File: dispute-resolver_test.ts**
- [ ] Create dispute within window → succeeds
- [ ] Create dispute outside window (>24 hours) → ERR-410
- [ ] Create duplicate dispute → ERR-409
- [ ] Execute refund: valid seller (tx-sender) → transfers STX
- [ ] Execute refund: wrong caller (not seller) → ERR-403
- [ ] Execute refund: dispute not open → ERR-409
- [ ] Execute refund: buyer balance increases by exact amount
- [ ] Acknowledge dispute → status changes to "acknowledged"
- [ ] Reject dispute with counter-proof → status "rejected"
- [ ] Mark dispute expired (>7 days) → status "expired"

## Integration Tests

### 402 Payment Flow (`packages/proxy/tests/integration/`)

**File: 402-flow.test.ts**
- [ ] Full flow: unpaid request → 402 → pay → retry → 200 + receipt
- [ ] Payment verification with mock facilitator
- [ ] Payment verification on-chain (mock Stacks API)
- [ ] Receipt signature verifiable off-chain
- [ ] Deliverable hash matches response body
- [ ] Idempotency: retry with same key → cached response

### Dispute Flow (`packages/proxy/tests/integration/`)

**File: dispute-flow.test.ts**
- [ ] Create dispute for receipt within 24 hours
- [ ] Seller signs refund authorization
- [ ] Refund signature verified off-chain
- [ ] Seller calls execute-refund on-chain (mock)
- [ ] Buyer receives refund (balance check)
- [ ] Dispute status updates to "resolved"
- [ ] Reputation score decreases after refund

### Reputation Update (`packages/proxy/tests/integration/`)

**File: reputation-update.test.ts**
- [ ] Receipt generated → reputation update transaction broadcast
- [ ] Nonce management: sequential nonces for multiple receipts
- [ ] Nonce conflict handling (retry with updated nonce)
- [ ] Contract call with post-conditions
- [ ] Reputation score increments on-chain (query after update)
- [ ] Fire-and-forget: reputation failure doesn't block receipt

## Adversarial Tests

### Replay Attacks (`packages/proxy/tests/adversarial/`)

**File: replay-attacks.test.ts**
- [ ] Replay old PAYMENT-SIGNATURE → rejected (timestamp bucket expired)
- [ ] Replay payment for different request → rejected (payment binding)
- [ ] Replay payment within same bucket with different body → rejected
- [ ] Modify request after payment → hash mismatch → rejected
- [ ] Replay refund authorization for different dispute → rejected

### Signature Forgery (`packages/proxy/tests/adversarial/`)

**File: signature-forgery.test.ts**
- [ ] Receipt signed with attacker key → verification fails
- [ ] Receipt modified after signing → verification fails
- [ ] Refund authorization signed with wrong key → verification fails
- [ ] Receipt with future key_version → verification fails

### Payment Manipulation (`packages/proxy/tests/adversarial/`)

**File: payment-manipulation.test.ts**
- [ ] Payment amount < required → rejected
- [ ] Payment to wrong recipient → rejected
- [ ] Payment with forged confirmation → rejected (on-chain check)
- [ ] Payment with insufficient confirmations → rejected
- [ ] Double-spend attempt (same txid, different requests) → rejected

### Nonce Conflicts (`packages/proxy/tests/adversarial/`)

**File: nonce-conflicts.test.ts**
- [ ] Concurrent reputation updates → one succeeds, one retries
- [ ] Nonce too high → transaction rejected, fetch updated nonce
- [ ] Nonce too low → transaction rejected, increment nonce

## End-to-End Tests

### Full User Journeys (`packages/proxy/tests/e2e/`)

**File: buyer-journey.test.ts**
- [ ] Buyer discovers service in directory
- [ ] Buyer makes request → 402 challenge
- [ ] Buyer pays via wallet
- [ ] Buyer receives receipt + response
- [ ] Buyer verifies delivery hash matches
- [ ] Buyer files dispute (delivery hash mismatch)
- [ ] Seller issues refund
- [ ] Buyer receives refund on-chain

**File: seller-journey.test.ts**
- [ ] Seller registers service with stake
- [ ] Seller updates service policy
- [ ] Seller serves paid request → receipt generated
- [ ] Seller's reputation score increases
- [ ] Seller handles dispute → issues refund
- [ ] Seller deactivates service
- [ ] Seller withdraws stake

**File: cli-journey.test.ts**
- [ ] `stxact curl` makes paid request → returns response + receipt
- [ ] `stxact verify-receipt` validates signature
- [ ] `stxact dispute create` files dispute
- [ ] `stxact list-services` queries directory

## Performance Tests

### Load Testing (`packages/proxy/tests/performance/`)

**File: load-test.ts**
- [ ] 1000 concurrent 402 requests → <300ms p95 overhead
- [ ] Rate limiter: 101 concurrent unpaid requests → 100 succeed, 1 gets 429
- [ ] Database connection pool: max 20 connections under load
- [ ] BNS cache hit rate: >90% under realistic load
- [ ] Redis idempotency cache: <10ms lookup time

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/`)

**File: ci.yml**
- [ ] Lint: ESLint + Prettier on all TypeScript files
- [ ] Clarity Check: `clarinet check` on all contracts
- [ ] Unit Tests: Jest with coverage threshold (>80%)
- [ ] Contract Tests: Clarinet test suite
- [ ] Integration Tests: API + blockchain integration
- [ ] Security Audit: `npm audit --audit-level=high`
- [ ] Container Scan: Trivy on Docker images
- [ ] Coverage Report: Upload to Codecov

**File: deploy.yml**
- [ ] Deploy contracts to testnet on merge to `develop`
- [ ] Deploy contracts to mainnet on merge to `main` (manual approval)
- [ ] Deploy proxy to staging on merge to `develop`
- [ ] Deploy proxy to production on merge to `main` (manual approval)

## Coverage Targets

| Module | Target | Current | Status |
|--------|--------|---------|--------|
| Crypto functions | >90% | 0% | ❌ |
| Middleware | >85% | 0% | ❌ |
| API endpoints | >80% | 0% | ❌ |
| Clarity contracts | >90% | ~30% | 🔶 |
| Integration | >70% | 0% | ❌ |
| **Overall** | **>80%** | **~5%** | ❌ |

## Acceptance Criteria

All tests must pass before mainnet deployment:
- [ ] 100% of unit tests passing
- [ ] 100% of integration tests passing
- [ ] 100% of adversarial tests passing
- [ ] Coverage >80% for all modules
- [ ] CI/CD pipeline green
- [ ] Security audit complete with no high-severity findings

## Next Steps

1. **Phase 1: Unit Tests (Week 1-2)**
   - Crypto module tests
   - Middleware tests
   - Complete Clarity contract tests

2. **Phase 2: Integration Tests (Week 3)**
   - 402 flow
   - Dispute flow
   - Reputation updates

3. **Phase 3: Adversarial Tests (Week 4)**
   - Replay attacks
   - Signature forgery
   - Payment manipulation

4. **Phase 4: E2E + CI/CD (Week 5)**
   - User journeys
   - GitHub Actions pipeline
   - Coverage enforcement

---

**This test plan ensures ZERO gaps in security and functionality before production deployment.**
