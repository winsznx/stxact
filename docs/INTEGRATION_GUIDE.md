# stxact Integration Guide

This guide shows how to add stxact to an existing x402 service and how buyers consume protected endpoints.

## 1. Service Integration (Proxy)

Use `@stxact/proxy` middleware in front of your existing endpoint:

```ts
import express from 'express';
import { createX402PaymentGate } from '@stxact/proxy/middleware/x402-payment-gate';
import { generateReceiptMiddleware } from '@stxact/proxy/middleware/generate-receipt';

const app = express();

const paymentGate = createX402PaymentGate({
  amountSTX: 0.1,
  payTo: process.env.SERVICE_PRINCIPAL!,
  network: (process.env.STACKS_NETWORK || 'testnet') as 'mainnet' | 'testnet',
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
  description: 'Premium endpoint',
});

app.get(
  '/premium',
  paymentGate,
  generateReceiptMiddleware,
  async (_req, res) => {
    res.status(200).json({ ok: true, data: 'protected content' });
  }
);
```

## 2. Buyer Integration (TypeScript)

Use `x402-stacks` to auto-pay HTTP 402 challenges:

```ts
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY!, 'testnet');
const api = wrapAxiosWithPayment(
  axios.create({ baseURL: 'http://localhost:3001' }),
  account
);

const response = await api.get('/premium');
console.log(response.data);
console.log(response.headers['x-stxact-receipt']); // base64 receipt JSON
```

## 3. Buyer Integration (Python)

Python clients follow the same protocol:

1. Send request to protected endpoint.
2. If status is `402`, parse `payment-required`.
3. Pay via your x402-compatible signer.
4. Retry request with `payment-signature` header.
5. Decode and store `x-stxact-receipt`.

```python
import base64
import requests

url = "http://localhost:3001/premium"
r = requests.get(url)

if r.status_code == 402:
    payment_required_b64 = r.headers["payment-required"]
    payment_required = base64.b64decode(payment_required_b64).decode("utf-8")
    # Use your x402 signer/facilitator client here to produce payment_signature
    payment_signature = "<base64-payment-signature>"
    r = requests.get(url, headers={"payment-signature": payment_signature})

r.raise_for_status()
receipt_b64 = r.headers.get("x-stxact-receipt")
print("receipt:", receipt_b64)
print("payload:", r.json())
```

## 4. Buyer Integration (Go)

```go
package main

import (
  "encoding/base64"
  "fmt"
  "io"
  "net/http"
)

func main() {
  url := "http://localhost:3001/premium"
  req, _ := http.NewRequest("GET", url, nil)
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    panic(err)
  }
  defer res.Body.Close()

  if res.StatusCode == http.StatusPaymentRequired {
    paymentRequired := res.Header.Get("payment-required")
    decoded, _ := base64.StdEncoding.DecodeString(paymentRequired)
    fmt.Println("payment-required:", string(decoded))

    // Use your x402 signer/facilitator client here.
    paymentSignature := "<base64-payment-signature>"
    req2, _ := http.NewRequest("GET", url, nil)
    req2.Header.Set("payment-signature", paymentSignature)
    res, err = http.DefaultClient.Do(req2)
    if err != nil {
      panic(err)
    }
    defer res.Body.Close()
  }

  body, _ := io.ReadAll(res.Body)
  fmt.Println("status:", res.StatusCode)
  fmt.Println("receipt:", res.Header.Get("x-stxact-receipt"))
  fmt.Println("body:", string(body))
}
```

## 5. CLI Quick Verification

```bash
stxact curl http://localhost:3001/demo/premium-data \
  --wallet ~/.stacks-wallet.json \
  --output receipt.json \
  --verify
```

```bash
stxact verify-receipt receipt.json --on-chain
```

## 6. Minimum Production Checklist

- `POST /receipts/verify` enabled for public verification
- `POST /disputes` enabled for buyer dispute filing
- `GET /directory/services` and `GET /directory/services/{id}` enabled
- `.well-known/stxact-config` published with capabilities and token metadata
- `X402_FACILITATOR_URL` and Stacks network env vars configured
