# Quick Start: Testing x402-stacks Integration

## Prerequisites

1. Node.js >= 18.0.0
2. PostgreSQL running
3. Redis running (optional, for caching)
4. Stacks wallet with testnet STX

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=stxact
POSTGRES_PASSWORD=changeme
POSTGRES_DB=stxact

# Stacks Network
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so

# Service Identity (NEVER commit actual keys!)
SELLER_PRIVATE_KEY=your_private_key_here
SERVICE_PRINCIPAL=ST... # derived from SELLER_PRIVATE_KEY

# x402 Facilitator
X402_FACILITATOR_URL=https://facilitator.stacksx402.com
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Start Server

```bash
npm run dev
```

Server starts on `http://localhost:3001`

## Testing the x402 Payment Flow

### Step 1: Request Without Payment (Expect 402)

```bash
curl -i http://localhost:3001/demo/premium-data
```

**Expected Response:**
```
HTTP/1.1 402 Payment Required
payment-required: eyJ4NDAyVmVyc2lvbiI6Miwi...
Content-Type: application/json

{
  "error": "payment_required",
  "message": "Payment required to access this resource"
}
```

**Decode the payment-required header:**
```bash
# Extract base64 value from header
echo "eyJ4NDAyVmVyc2lvbiI6Miwi..." | base64 -d | jq
```

**Expected decoded format:**
```json
{
  "x402Version": 2,
  "resource": {
    "url": "http://localhost:3001/demo/premium-data",
    "description": "Demo premium data endpoint"
  },
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

### Step 2: Client-Side Payment (Using x402-stacks)

Create a test client:

```typescript
// test-client.ts
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

async function testPayment() {
  // Create account from private key
  const account = privateKeyToAccount(
    process.env.BUYER_PRIVATE_KEY!,
    'testnet'
  );

  // Wrap axios with automatic payment handling
  const api = wrapAxiosWithPayment(
    axios.create({ baseURL: 'http://localhost:3001' }),
    account
  );

  try {
    // First request will get 402, pay automatically, retry
    const response = await api.get('/demo/premium-data');

    console.log('Success!');
    console.log('Data:', response.data);
    console.log('Receipt:', response.headers['x-stxact-receipt']);
    console.log('Payment Response:', response.headers['payment-response']);
  } catch (error) {
    console.error('Payment failed:', error);
  }
}

testPayment();
```

Run the client:
```bash
ts-node test-client.ts
```

**Expected Output:**
```
Success!
Data: {
  data: {
    timestamp: 1234567890,
    message: 'This is premium data',
    insights: [...],
    metrics: {...}
  },
  payment_info: {
    txid: '0xabc123...',
    amount: '100000',
    payer: 'ST...'
  }
}
Receipt: eyJyZWNlaXB0X2lkIjoi...
Payment Response: eyJzdWNjZXNzIjp0cnVlLCJ...
```

### Step 3: Verify Receipt

Decode the receipt header:

```bash
# Extract x-stxact-receipt header value
echo "eyJyZWNlaXB0X2lkIjoi..." | base64 -d | jq
```

**Expected receipt format:**
```json
{
  "receipt_id": "uuid",
  "request_hash": "sha256-hash",
  "payment_txid": "0xabc123...",
  "seller_principal": "ST...",
  "buyer_principal": "ST...",
  "delivery_commitment": "sha256-hash",
  "timestamp": 1234567890,
  "block_height": 123456,
  "block_hash": "0x...",
  "key_version": 1,
  "revision": 0,
  "service_policy_hash": "sha256-hash",
  "metadata": {
    "endpoint": "GET /demo/premium-data",
    "price_sats": "100000",
    "token_contract": "SP...sbtc-token"
  },
  "signature": "base64-signature"
}
```

### Step 4: Verify Receipt Signature

```bash
curl -X POST http://localhost:3001/receipts/verify \
  -H "Content-Type: application/json" \
  -d '{
    "receipt": <paste-decoded-receipt-json>
  }'
```

**Expected Response:**
```json
{
  "valid": true,
  "checks": {
    "signature_valid": true,
    "principal_match": true
  },
  "details": {
    "payment_block_height": 123456
  }
}
```

### Step 5: Check Idempotency

Retry the same request (should return cached response):

```bash
curl -X GET http://localhost:3001/demo/premium-data \
  -H "payment-signature: <same-payment-signature>" \
  -H "X-Idempotency-Key: unique-key-123"
```

**Expected**: Same response, no new payment required

### Step 6: Test Replay Attack Prevention

Try to use the same payment for a different request:

```bash
curl -X POST http://localhost:3001/demo/ai-inference \
  -H "payment-signature: <same-payment-signature>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Different request"}'
```

**Expected Response:**
```
HTTP/1.1 409 Conflict
{
  "error": "payment_already_used",
  "message": "Payment transaction already used for different request"
}
```

## Monitoring

### Check Logs

```bash
# Server logs show payment flow
npm run dev
```

**Expected log entries:**
```
[INFO] Generated 402 challenge { request_hash: '...', path: '/demo/premium-data' }
[INFO] Payment verified and bound to request { payment_txid: '0x...', request_hash: '...' }
[INFO] Receipt generated and signed { receipt_id: '...', payment_txid: '0x...' }
[INFO] Reputation update transaction broadcast { tx_id: '0x...', seller_principal: 'ST...' }
```

### Check Database

```bash
psql -U stxact -d stxact -c "SELECT * FROM used_payments;"
psql -U stxact -d stxact -c "SELECT * FROM receipts ORDER BY created_at DESC LIMIT 5;"
```

### Check On-Chain

```bash
# Check payment transaction
curl https://api.testnet.hiro.so/extended/v1/tx/0xabc123...

# Check reputation update transaction
curl https://api.testnet.hiro.so/extended/v1/tx/0xdef456...
```

## Health Check

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}
```

## Common Issues

### Issue: 402 response but no payment-required header

**Solution**: Check CORS configuration allows exposing `payment-required` header

### Issue: Payment fails with "invalid network"

**Solution**: Verify `STACKS_NETWORK=testnet` in `.env` and network matches in payment payload

### Issue: Payment succeeds but no receipt generated

**Solution**: Check `SELLER_PRIVATE_KEY` is configured and valid

### Issue: Reputation update fails with nonce error

**Solution**: Nonce manager will automatically retry. Check logs for nonce conflicts.

### Issue: Facilitator timeout

**Solution**: Verify `X402_FACILITATOR_URL` is reachable and testnet facilitator is operational

## Performance Testing

### Load Test (100 concurrent requests)

```bash
# Install Apache Bench
brew install ab

# Run load test (requires pre-paid requests)
ab -n 100 -c 10 http://localhost:3001/demo/premium-data
```

**Expected**: All requests succeed, no nonce conflicts

## Next Steps

1. Test with live testnet facilitator
2. Deploy contracts to testnet
3. Test end-to-end payment flow
4. Load test with concurrent requests
5. Security review before mainnet

## Support

- **x402-stacks Docs**: https://docs.x402stacks.xyz/
- **Facilitator Status**: https://facilitator.stacksx402.com/supported
- **Stacks Explorer**: https://explorer.hiro.so/?chain=testnet
- **API Documentation**: http://localhost:3001/.well-known/stxact-config

