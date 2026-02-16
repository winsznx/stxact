# x402-stacks Integration Complete

## Summary

Replaced custom x402 protocol implementation with official `x402-stacks` library (v2.0.1).

## Changes Made

### 1. New Files Created

#### `packages/proxy/src/middleware/x402-payment-gate.ts`
- **Purpose**: x402 payment gate using official x402-stacks library
- **Exports**: `createX402PaymentGate(config)` function
- **Flow**:
  1. x402-stacks `paymentMiddleware` handles 402 challenge + payment verification
  2. stxact payment binding prevents replay attacks
  3. stxact request hash computed for idempotency
  4. Downstream middleware generates receipt and updates reputation

#### `packages/proxy/src/api/demo.ts`
- **Purpose**: Demo endpoints showing x402 + stxact integration
- **Endpoints**:
  - `GET /demo/premium-data` - Protected endpoint requiring 0.1 STX payment
  - `POST /demo/ai-inference` - Protected AI inference endpoint

### 2. Files Modified

#### `packages/proxy/src/index.ts`
- **Added**: Import and mount `/demo` routes
- **Updated**: CORS headers to use x402 v2 lowercase headers:
  - `payment-required` (was `PAYMENT-REQUIRED`)
  - `payment-signature` (was `PAYMENT-SIGNATURE`)
  - `payment-response` (new)
- **Removed**: Old `challenge402Limiter` export (x402-stacks handles rate limiting)

#### `.env.example`
- **Updated**: `X402_FACILITATOR_URL` to official facilitator:
  - Old: `https://x402-facilitator.example.com`
  - New: `https://facilitator.stacksx402.com`

#### `packages/proxy/package.json`
- **Confirmed**: Both packages already installed:
  - `@x402/core@2.3.1` (Coinbase official x402 protocol)
  - `x402-stacks@2.0.1` (Stacks-specific wrapper)

### 3. Old Files (Not Deleted, But Superseded)

These files are no longer used but kept for reference:
- `packages/proxy/src/middleware/x402-challenge.ts` - Custom 402 generation (replaced by x402-stacks)
- `packages/proxy/src/middleware/verify-payment.ts` - Custom payment verification (replaced by x402-stacks)

## Architecture

### x402 Protocol Layer (Official Library)
```
┌─────────────────────────────────────────┐
│ x402-stacks paymentMiddleware           │
│ - Generates 402 challenges              │
│ - Verifies payment signatures           │
│ - Settles via facilitator               │
│ - Uses v2 headers (lowercase)           │
└─────────────────────────────────────────┘
```

### stxact Application Layer (Custom Logic)
```
┌─────────────────────────────────────────┐
│ Payment Binding (replay protection)    │
│ - Binds payment txid to request hash   │
│ - Permanent storage (no TTL)           │
│ - Prevents replay attacks              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Receipt Generation                      │
│ - Cryptographic proof of delivery       │
│ - Seller signature                      │
│ - Deliverable hash                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Reputation Update (fire-and-forget)    │
│ - On-chain contract call               │
│ - Nonce manager (thread-safe)          │
│ - Logarithmic scoring                   │
└─────────────────────────────────────────┘
```

## Usage Example

### Server-Side (Express.js)

```typescript
import { createX402PaymentGate } from './middleware/x402-payment-gate';
import { generateReceiptMiddleware } from './middleware/generate-receipt';

const paymentGate = createX402PaymentGate({
  amountSTX: 0.1, // 0.1 STX required
  payTo: process.env.SERVICE_PRINCIPAL!,
  network: 'testnet',
  facilitatorUrl: 'https://facilitator.stacksx402.com',
  description: 'Premium API access',
});

router.get(
  '/premium-data',
  paymentGate, // x402 payment verification + stxact binding
  generateReceiptMiddleware, // Generate cryptographic receipt
  (req, res) => {
    res.json({ data: 'premium content' });
  }
);
```

### Client-Side (axios)

```typescript
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

// Create account from private key
const account = privateKeyToAccount(process.env.PRIVATE_KEY!, 'testnet');

// Wrap axios with automatic payment handling
const api = wrapAxiosWithPayment(
  axios.create({ baseURL: 'https://api.example.com' }),
  account
);

// Use normally - 402 payments are handled automatically!
const response = await api.get('/demo/premium-data');
console.log(response.data); // Premium content
console.log(response.headers['x-stxact-receipt']); // Cryptographic receipt
```

## Header Format

### x402 v2 Protocol Headers (lowercase)

**Request Headers:**
- `payment-signature`: Base64-encoded payment payload
  ```json
  {
    "x402Version": 2,
    "accepted": { ... },
    "payload": { "transaction": "0x..." }
  }
  ```

**Response Headers (402 Payment Required):**
- `payment-required`: Base64-encoded payment requirements
  ```json
  {
    "x402Version": 2,
    "resource": { "url": "..." },
    "accepts": [
      {
        "scheme": "exact",
        "network": "stacks:2147483648",
        "amount": "100000",
        "asset": "STX",
        "payTo": "ST...",
        "maxTimeoutSeconds": 300
      }
    ]
  }
  ```

**Response Headers (200 OK):**
- `payment-response`: Base64-encoded settlement response
  ```json
  {
    "success": true,
    "transaction": "0xabc123...",
    "network": "stacks:2147483648",
    "payer": "ST..."
  }
  ```

### stxact Custom Headers

**Response Headers (all successful requests):**
- `X-stxact-Receipt-ID`: UUID of generated receipt
- `X-stxact-Deliverable-Hash`: SHA-256 hash of response body
- `X-stxact-Signature`: Seller's cryptographic signature
- `X-stxact-Receipt`: Base64-encoded complete receipt object

## Network Identifiers (CAIP-2)

x402 v2 uses CAIP-2 network identifiers:
- **Mainnet**: `stacks:1`
- **Testnet**: `stacks:2147483648`

## Facilitator Pattern

```
1. Client → Server: GET /premium-data
2. Server → Client: 402 Payment Required (payment-required header)
3. Client: Signs STX transaction (does NOT broadcast)
4. Client → Server: GET /premium-data (payment-signature header)
5. Server → Facilitator: POST /settle (signed transaction)
6. Facilitator: Broadcasts transaction, waits for confirmation
7. Facilitator → Server: Settlement response
8. Server: Verifies payment, binds to request
9. Server → Client: 200 OK (payment-response header + stxact receipt)
```

## Key Benefits

1. **Standard Compliance**: Uses official x402 v2 protocol (Coinbase-compatible)
2. **Production Ready**: Official facilitator at https://facilitator.stacksx402.com
3. **Atomic Payments**: Payment and access granted together
4. **No Double-Spending**: Server controls when transaction is broadcast
5. **Reliable Confirmation**: Facilitator handles blockchain polling
6. **Replay Protection**: stxact payment binding ensures one payment = one request
7. **Cryptographic Receipts**: Proof of delivery with seller signature
8. **Reputation Updates**: On-chain reputation tracking (fire-and-forget)

## Testing

### Manual Testing

1. Start server:
   ```bash
   npm run dev
   ```

2. Request without payment:
   ```bash
   curl -i http://localhost:3000/demo/premium-data
   # Expected: 402 Payment Required + payment-required header
   ```

3. Request with x402-stacks client:
   ```typescript
   // See client-side example above
   ```

### Integration Tests

Integration tests are in the works (see VERIFICATION_STATUS.md).

## Environment Variables

Required for x402 integration:
```bash
# x402 Facilitator
X402_FACILITATOR_URL=https://facilitator.stacksx402.com

# Stacks Network
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so

# Service Identity
SERVICE_PRINCIPAL=ST...
SELLER_PRIVATE_KEY=...

# stxact Application Layer
REPUTATION_MAP_ADDRESS=ST...reputation-map
```

## Migration Notes

### For Existing Deployments

1. **No Breaking Changes**: Old custom middleware files still exist
2. **Add New Routes**: Mount `/demo` routes to test new integration
3. **Update CORS**: Add lowercase x402 headers to allowed/exposed headers
4. **Update Facilitator URL**: Change to `https://facilitator.stacksx402.com`
5. **Test**: Use demo endpoints to verify x402 + stxact flow works end-to-end

### For New Deployments

1. Use `createX402PaymentGate()` for all payment-protected endpoints
2. Follow demo endpoint pattern in `src/api/demo.ts`
3. Always apply `generateReceiptMiddleware` after payment gate
4. Configure facilitator URL in environment variables

## Verification Checklist

- [x] x402-stacks library installed (v2.0.1)
- [x] Payment gate middleware created
- [x] Demo endpoints implemented
- [x] CORS headers updated to v2 format (lowercase)
- [x] Facilitator URL configured
- [x] Type safety verified (no errors in new code)
- [ ] Integration test with live facilitator
- [ ] Load test (100+ concurrent requests)
- [ ] End-to-end test with actual STX payments

## Next Steps

1. **Deploy to Testnet**: Deploy contracts and test with real STX
2. **Integration Tests**: Write automated tests for x402 + stxact flow
3. **Load Testing**: Verify nonce manager handles concurrent requests
4. **Documentation**: Update PRD to clarify x402 vs stxact responsibilities
5. **Security Audit**: External audit before mainnet deployment

## References

- x402-stacks Documentation: https://docs.x402stacks.xyz/
- x402-stacks GitHub: https://github.com/tony1908/x402Stacks
- Coinbase x402 Spec: https://github.com/coinbase/x402
- Official Facilitator: https://facilitator.stacksx402.com
- PRD: packages/contracts/PRD.md (Section 6 - Payment Protocol)
