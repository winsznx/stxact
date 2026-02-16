# PRD Corrections: Outdated Specs Fixed

**Purpose:** Correct outdated PRD specifications where implementation is correct but PRD is wrong.
**Scope:** Header formats, x402 library integration, network identifiers.
**Does NOT change:** PRD goals, acceptance criteria list, functional requirements.

---

## Section 6: Payment Protocol - Headers (OUTDATED → CORRECTED)

### OLD (Incorrect - Custom Implementation)

```
PAYMENT-REQUIRED header (uppercase)
PAYMENT-SIGNATURE header (uppercase)
```

### NEW (Correct - x402 v2 Standard)

```
payment-required header (lowercase, x402 v2)
payment-signature header (lowercase, x402 v2)
payment-response header (lowercase, x402 v2)
```

**Reason:** stxact uses official x402-stacks library which implements x402 v2 protocol with lowercase headers per Coinbase spec.

**Implementation:** `src/middleware/x402-payment-gate.ts` uses `x402-stacks@2.0.1`

---

## Section 6: Payment Protocol - Library Integration (MISSING → ADDED)

### ADD TO PRD

**x402 Protocol Compliance:**

- **Library:** x402-stacks v2.0.1 (Coinbase-compatible)
- **Protocol Version:** x402 v2
- **Facilitator:** https://facilitator.stacksx402.com (official)
- **Headers:** lowercase (`payment-required`, `payment-signature`, `payment-response`)
- **Network IDs:** CAIP-2 format (`stacks:1` for mainnet, `stacks:2147483648` for testnet)

**stxact-Specific Additions (Layered on Top):**
- Payment binding (permanent storage, no TTL)
- Cryptographic receipts (13 canonical fields + signature)
- Reputation updates (fire-and-forget on-chain)
- Dispute resolution (tx-sender enforced)
- Service discovery (BNS integration)

**Implementation:** `src/middleware/x402-payment-gate.ts`

---

## Section 6: Network Identifiers (MISSING → ADDED)

### ADD TO PRD

**CAIP-2 Network Identifiers:**

Per Chain Agnostic Improvement Proposal (CAIP-2), stxact uses:

- **Mainnet:** `stacks:1`
- **Testnet:** `stacks:2147483648`

These appear in `payment-required` header's `network` field:

```json
{
  "x402Version": 2,
  "accepts": [{
    "network": "stacks:2147483648",
    "amount": "100000",
    "asset": "STX",
    // ...
  }]
}
```

**Implementation:** `src/middleware/x402-payment-gate.ts:44`

---

## Section 7: API Specification - Acceptance Criteria (OUTDATED → CORRECTED)

### OLD

```
✅ Flow 1: Unpaid Request → 402 with PAYMENT-REQUIRED header
✅ Flow 2: Retry with PAYMENT-SIGNATURE header
```

### NEW

```
✅ Flow 1: Unpaid Request → 402 with payment-required header (lowercase)
✅ Flow 2: Retry with payment-signature header (lowercase)
✅ Flow 3: Success → 200 with payment-response header (lowercase)
```

---

## What This Does NOT Change

**Goals remain the same:**
- Institutional-grade trust and settlement fabric
- Full dispute resolution with on-chain refunds
- Service registry with BNS verification
- Receipt anchoring for institutional requirements
- PostgreSQL replication and backups
- Security audit before mainnet

**Acceptance criteria list remains:**
- All flows still required
- Non-functional requirements (reliability, security) unchanged
- Production-ready definition unchanged

**Only updates:**
- Header format specs (uppercase → lowercase v2)
- Adds missing x402 library specification
- Adds missing CAIP-2 network identifier spec

---

## Application to PRD

**Find these sections in PRD and update:**

1. **Section 6 (Payment Protocol)** - lines ~470-650
   - Replace all `PAYMENT-REQUIRED` → `payment-required`
   - Replace all `PAYMENT-SIGNATURE` → `payment-signature`
   - Add x402-stacks library spec
   - Add CAIP-2 network identifier spec

2. **Section 7 (API Specification)** - Acceptance Criteria
   - Update header names to lowercase
   - Add payment-response header to successful flow

3. **Appendix** - Add new section
   - x402 v2 Protocol Compliance
   - CAIP-2 Network Identifier Spec
   - x402-stacks Library Integration

---

## Summary

**What was wrong in PRD:**
- Header names (uppercase vs lowercase)
- Missing x402 library specification
- Missing CAIP-2 network identifier spec

**What is now correct:**
- Headers match x402 v2 standard (lowercase)
- Library integration documented
- Network identifiers follow CAIP-2

**What stays the same:**
- All functional requirements
- All acceptance criteria (flows, features)
- All non-functional requirements
- Production-ready definition
