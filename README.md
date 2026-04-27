# stxact

**Trust & Settlement Fabric for x402 Services on Stacks**

stxact is a protocol layer that makes paid HTTP APIs (x402) accountable. It wraps any x402 endpoint with signed receipts, on-chain reputation, delivery verification, and dispute rails so that agents, institutions, and developers can pay for Bitcoin DeFi services without blindly trusting the operator.

## Why stxact Exists

The x402 protocol lets any HTTP endpoint require payment before serving content. But paying does not mean you got what you paid for.

When an autonomous agent pays 0.1 sBTC for a yield simulation, there is no proof the endpoint ran the computation. When a treasury operator pays for a quote and gets a 500 error, there is no record of what happened. Service operators can spin up new identities to escape bad history.

**stxact closes these gaps:**

- Every paid request produces a **signed receipt** with a SHA-256 hash of the actual response. Buyers can verify they got the exact output the seller committed to.
- Reputation is **anchored to Stacks principals**, not domains. A seller cannot reset their track record by changing URLs.
- Disputes are handled **on-chain** through smart contracts. Refunds are real STX transfers, not promises.
- Receipts can be **anchored to the blockchain** for permanent, third-party verifiable proof.

## What It Does

| Feature | How It Works |
|---|---|
| **Signed Receipts** | Every paid request produces an ECDSA-signed receipt containing request hash, payment txid, seller identity, and a SHA-256 hash of the response body |
| **Delivery Verification** | Buyers hash the response they receive and compare it against the hash committed in the receipt. Match = verified delivery |
| **On-Chain Reputation** | Successful deliveries increment a seller's reputation score on the `reputation-map` contract. Score is public, permanent, and tied to their Stacks address |
| **Dispute Resolution** | Buyers file disputes referencing a receipt. Sellers can acknowledge, issue refunds (real STX transfers), or reject with evidence. All state changes happen on-chain |
| **Receipt Anchoring** | Receipt hashes can be submitted to `receipt-anchor.clar` for permanent blockchain proof. Useful for audit trails and compliance |
| **Service Directory** | Sellers register on-chain with a 100 STX stake bond. The directory shows stake amount, reputation score, policy hash, and active status |

## Architecture

stxact is a monorepo with four packages:

```
stxact/
  packages/
    contracts/     Clarity smart contracts (Stacks blockchain)
    proxy/         Express.js middleware and API server
    webapp/        Next.js frontend dashboard
    cli/           Command-line interface (planned)
  infra/           Docker, migrations, Terraform configs
  docs/            PRD, deployment guides, API docs
  scripts/         Database migration scripts
```

### System Overview

```mermaid
graph TB
    subgraph Buyers
        Agent[AI Agent / Bot]
        Dev[Developer App]
        Treasury[Treasury Operator]
    end

    subgraph stxact Infrastructure
        Proxy[stxact Proxy<br/>Express.js Middleware]
        DB[(Receipt Store<br/>PostgreSQL)]
        UI[Dashboard<br/>Next.js]
    end

    subgraph Stacks Blockchain
        SR[service-registry.clar]
        RM[reputation-map.clar]
        DR[dispute-resolver.clar]
        RA[receipt-anchor.clar]
    end

    subgraph Seller Infrastructure
        API[Upstream API<br/>Yield / Treasury / Staking]
    end

    Agent --> Proxy
    Dev --> Proxy
    Treasury --> Proxy

    Proxy -->|402 Challenge + Verify Payment| Proxy
    Proxy -->|Forward After Payment| API
    API -->|Response| Proxy
    Proxy -->|Store Receipt| DB
    Proxy -->|Update Reputation| RM
    Proxy -->|Receipt + Response| Agent

    UI -->|Read Service Data| SR
    UI -->|Read Reputation| RM
    UI -->|Manage Disputes| DR
    UI -->|Anchor Receipts| RA

    Proxy -->|Register Service| SR
```

### Payment Flow

How a single paid API call produces a verifiable, signed receipt with delivery proof.

```mermaid
sequenceDiagram
    participant Buyer as Buyer (Agent/App)
    participant Proxy as stxact Proxy
    participant x402 as x402 Facilitator
    participant Upstream as Upstream API
    participant Store as Receipt Store
    participant Chain as Stacks Contracts

    Buyer->>Proxy: GET /api/yield-route
    Proxy-->>Buyer: 402 Payment Required<br/>PAYMENT-REQUIRED header

    Buyer->>Buyer: Parse challenge, sign payment
    Buyer->>Proxy: GET /api/yield-route<br/>PAYMENT-SIGNATURE header

    Proxy->>x402: Verify payment signature
    x402-->>Proxy: Valid (payment_txid)

    Proxy->>Proxy: Compute request_hash<br/>Check idempotency<br/>Bind payment to this request

    Proxy->>Upstream: Forward original request
    Upstream-->>Proxy: 200 OK (response body)

    Proxy->>Proxy: delivery_hash = SHA256(body)<br/>Sign receipt with seller key

    Proxy->>Store: Store receipt
    Proxy->>Chain: Record successful delivery

    Proxy-->>Buyer: 200 OK + Response<br/>X-stxact-Receipt-ID<br/>X-stxact-Deliverable-Hash<br/>X-stxact-Signature

    Buyer->>Buyer: Verify SHA256(body) matches receipt hash<br/>Verify ECDSA signature against seller principal
```

### Dispute Resolution

When delivery verification fails, buyers file disputes that resolve on-chain.

```mermaid
sequenceDiagram
    participant Buyer
    participant Dashboard as stxact Dashboard
    participant DR as dispute-resolver.clar
    participant Seller
    participant RM as reputation-map.clar

    Buyer->>Buyer: SHA256(received response) does not match receipt hash

    Buyer->>Dashboard: File Dispute<br/>(receipt_id, reason)
    Dashboard->>DR: create-dispute<br/>(buyer, receipt_hash, reason)
    DR-->>Dashboard: dispute_id (status: open)

    Seller->>Dashboard: View open disputes
    Dashboard->>DR: get-dispute(dispute_id)

    alt Seller Acknowledges
        Seller->>DR: acknowledge-dispute(dispute_id)
        DR->>DR: status = acknowledged
    end

    alt Seller Issues Refund
        Seller->>DR: execute-refund(dispute_id, amount, buyer)
        DR->>DR: Transfer STX from seller to buyer
        DR->>DR: status = refunded
        DR->>RM: Record dispute outcome
        RM->>RM: Adjust reputation score
    end

    alt Seller Rejects with Evidence
        Seller->>DR: reject-dispute(dispute_id, evidence_hash)
        DR->>DR: status = rejected
    end
```

### Registration and Reputation

Sellers bond STX to register. Reputation builds over time from verified deliveries.

```mermaid
graph LR
    subgraph Registration
        A[Seller connects wallet] --> B[Bond 100 STX]
        B --> C[service-registry.clar<br/>stores endpoint hash,<br/>policy hash, stake]
    end

    subgraph Operations
        C --> D[Serve paid API requests]
        D --> E[Proxy records deliveries]
        E --> F[reputation-map.clar<br/>increments score]
    end

    subgraph Trust Signals
        F --> G[Reputation Score]
        C --> H[Stake Bond]
        E --> I[Receipt Count]
        G --> J[Directory Listing<br/>Buyers filter by trust]
        H --> J
        I --> J
    end
```

## Smart Contracts

All contracts are Clarity v2, deployed on Stacks testnet.

| Contract | What It Does | Key Functions |
|---|---|---|
| `service-registry` | Stores seller registrations with a 100 STX minimum stake bond | `register-service`, `update-service`, `get-service`, `deactivate-service` |
| `reputation-map` | Tracks delivery count, dispute count, and reputation score per seller. Manages signing key versions | `record-successful-delivery`, `record-dispute`, `rotate-signing-key`, `get-reputation` |
| `dispute-resolver` | Handles the full dispute lifecycle: creation, acknowledgement, refund (real STX transfer), rejection | `create-dispute`, `acknowledge-dispute`, `execute-refund`, `reject-dispute` |
| `receipt-anchor` | Stores receipt hashes on-chain for permanent proof that a receipt existed at a specific block height | `anchor-receipt`, `get-anchor`, `verify-anchor` |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- [Clarinet](https://github.com/hirosystems/clarinet) (for contract development)
- [Leather Wallet](https://leather.io/) (for testnet interaction)

### Installation

```bash
git clone https://github.com/your-org/stxact.git
cd stxact
npm install
```

### Run the Frontend

```bash
cd packages/webapp
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and connect your Leather wallet (testnet mode).

### Run the Proxy

```bash
cd packages/proxy
cp .env.example .env
npm run dev
```

### Deploy Contracts to Testnet

See [docs/TESTNET_DEPLOYMENT_GUIDE.md](docs/TESTNET_DEPLOYMENT_GUIDE.md) for the full walkthrough.

```bash
cd packages/contracts
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

## Environment Variables

Copy `.env.example` to `.env.local` (webapp) or `.env` (proxy) and set:

| Variable | What It Is |
|---|---|
| `NEXT_PUBLIC_STACKS_API_URL` | Stacks node API (default: `https://api.testnet.hiro.so`) |
| `NEXT_PUBLIC_STACKS_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_SERVICE_REGISTRY` | Deployed `service-registry` contract address |
| `NEXT_PUBLIC_REPUTATION_MAP` | Deployed `reputation-map` contract address |
| `NEXT_PUBLIC_DISPUTE_RESOLVER` | Deployed `dispute-resolver` contract address |
| `NEXT_PUBLIC_RECEIPT_ANCHOR` | Deployed `receipt-anchor` contract address |

## Project Structure

```
packages/
  contracts/
    contracts/
      service-registry.clar    Seller registration, staking, directory
      reputation-map.clar      Reputation scores, key rotation, delivery tracking
      dispute-resolver.clar    Dispute lifecycle, refund execution
      receipt-anchor.clar      On-chain receipt hash storage
    settings/
      Testnet.toml             Testnet deployment config
  proxy/
    src/
      middleware/
        x402-payment-gate.ts   x402 payment verification + replay protection
        receipt-generator.ts   Receipt creation and ECDSA signing
      crypto/
        payment-binding.ts     Binds a payment txid to a specific request (prevents reuse)
        request-hash.ts        Hashes request method + path + body + timestamp
      storage/
        receipts.ts            Receipt persistence (PostgreSQL)
      config/
        logger.ts              Winston logger
  webapp/
    src/
      app/(app)/
        seller/                Seller dashboard (registration, metrics, key rotation)
        disputes/              Dispute listing and resolution panel
        receipts/              Receipt viewer and signature verification
        directory/             Service directory browser
        audit/                 Audit trail viewer
      hooks/
        useService.ts          Fetches seller data from service-registry + reputation-map
        useWallet.ts           Stacks wallet connection
        useDisputes.ts         Dispute data
        useReceipts.ts         Receipt data
      providers/
        WalletProvider.tsx     Stacks Connect wallet context
      components/
        GlassCard.tsx          Glassmorphism UI cards
        MetricTile.tsx         Dashboard metric tiles
        VerificationRow.tsx    Receipt verification rows
```

## Roadmap

### Guiding Constraints

These boundaries are non-negotiable across all phases:

- No custody. stxact does not hold user funds.
- No pooled liquidity. No AMMs, no escrow pools, no bridge custody assumptions.
- Receipts are canonical audit objects: payment proof, delivery commitment, dispute outcome, reputation effect.
- On-chain state must be minimal and intentional: registry, stake bond, disputes, optional anchoring.
- Off-chain infra must be replaceable. Verification must be independently reproducible.

---

### Phase 1 — Foundation (Done)

- [x] 4 Clarity smart contracts deployed to testnet
- [x] x402 payment gate middleware with replay protection
- [x] Proxy server with receipt generation and ECDSA signing
- [x] Frontend dashboard with Leather wallet integration
- [x] On-chain seller registration with 100 STX stake bond
- [x] Live reputation score and signing key version display
- [x] Dispute filing, acknowledgement, refund, and rejection flows

---

### Phase 2 — Protocol Completion and Backend Hardening

Weeks 1–3. Close implementation gaps and ensure correctness before expanding scope.

**Missing API Endpoints**
- [ ] `GET /directory/services/:principal`
- [ ] `GET /receipts`
- [ ] `GET /disputes`
- [ ] `PATCH /disputes/:id`
- [ ] `GET /reputation/:principal`

**Replay Protection**
- [ ] Enforce `(payment_txid, request_hash)` uniqueness
- [ ] Concurrent submission stress tests
- [ ] Idempotency checks in service layer

**Dispute Canonical Message Hardening**
- [ ] Refund authorization binds: `dispute_id`, `amount`, buyer principal, seller principal, chain id, contract principal
- [ ] Signature forgery test cases

**Confirmation Handling**
- [ ] Configurable confirmation depth
- [ ] Shallow reorg test simulation
- [ ] Graceful receipt verification failure on invalidated transactions

Acceptance criteria: 85%+ test coverage, replay attack tests pass, dispute execution suite passes, end-to-end 402 flow validated, no 404 endpoints from frontend.

---

### Phase 3 — Trust Dashboard Finalization

Weeks 4–7. Turn the frontend into a serious trust control panel.

**Service Directory**
- [ ] Service cards with: principal, BNS, stake bonded, reputation score, success rate, total deliveries, dispute count, anchored badge, supported tokens
- [ ] Trust color coding: green (high reliability), yellow (moderate), red (risk exposure)

**Service Detail Page**
- [ ] Identity section: principal, BNS, registered block, stake amount, anchor status
- [ ] Reputation graph: deliveries over time, disputes over time, refunds executed, success rate trend
- [ ] Policy viewer: expandable JSON, SHA-256 hash, verified on-chain indicator
- [ ] Transaction history: receipt ID, payment amount, delivery hash, refund if any, block height

**Receipt Verification Matrix**
- [ ] Replace raw JSON display with structured verification panel
- [ ] Per-row checks: seller signature valid, address matches principal, payment confirmed, delivery hash match, key version valid, dispute status
- [ ] Each row shows: status, data source (on-chain / off-chain), raw reference link

**Dispute Timeline View**
- [ ] Visual state progression: Created → Seller Response → Refund Executed → Reputation Updated
- [ ] Display: refund TXID, block inclusion, evidence hash

Acceptance criteria: full buyer flow demo (Directory → Pay → Receipt → Verify), full seller flow demo (Delivery → Dispute → Refund → Reputation update), all trust indicators backed by real data, no decorative charts.

---

### Phase 4 — Audit and Compliance Tooling

Weeks 8–11. Position stxact for institutional and RWA alignment.

**Audit Bundle Export**
- [ ] Export per receipt: receipt JSON, signature payload, payment TX proof, delivery commitment, dispute record, reputation impact
- [ ] Formats: JSON, CSV, signed archive

**Bulk Export**
- [ ] Pagination for 10k+ receipts
- [ ] Streamed CSV generation
- [ ] Memory-safe export process

**SDK Layer**
- [ ] Client SDK: x402 flow wrapper, automatic receipt verification, replay protection helpers
- [ ] Server SDK: route wrapper middleware, canonical receipt builder, delivery commitment generator

Acceptance criteria: export 10k receipts without memory crash, independent verifier script confirms bundle integrity, SDK demo app runs in under 15 lines of integration.

---

### Phase 5 — Sponsored Transactions Evaluation

Weeks 12–13. Determine whether sponsored transactions fully solve gasless UX or if a standardization gap remains.

- [ ] Evaluate sponsored transaction capabilities on Stacks
- [ ] Document limitations: wallet support maturity, nonce semantics, developer friction
- [ ] Simulate sponsor griefing scenarios
- [ ] Test gas-sponsor economic sustainability
- [ ] Whitepaper section: "Gasless x402 on Stacks Today"
- [ ] Risk matrix for sponsored transaction model
- [ ] Clear determination: SIP needed, or reference contract standard sufficient?

---

### Phase 6 — SIP Submission (If Required)

Weeks 14–16. Standardize token authorization trait for SIP-010 if justified.

SIP: "SIP-010 Authorized Transfer Trait" — minimal interface:
- `transfer-with-authorization`
- `cancel-authorization`
- `get-authorization-status`

Requirements: domain separation, nonce consumption tracking, expiry field, chain-id binding, contract principal binding.

- [ ] Testnet reference implementation
- [ ] Independent audit
- [ ] Integration with x402 facilitator
- [ ] Draft SIP submission via Zero Authority DAO portal
- [ ] Community review period

Acceptance criteria: SIP draft published, testnet deployment live, independent verification of signature logic, no liquidity assumptions introduced.

---

### Phase 7 — Mainnet Deployment

Launch stxact infrastructure without expanding trust assumptions.

- [ ] Registry contract deployed
- [ ] Dispute contract deployed
- [ ] Reputation contract deployed
- [ ] Receipt anchoring enabled (optional)
- [ ] Explorer links published
- [ ] Independent verification script released

**Long-Term Vision**
- Service discovery reputation API standard
- Cross-chain receipt format compatibility
- Agent-native integration (x402 bots)
- Institutional analytics dashboard
- Multi-token trust indexing

## Docs

| Document | What It Covers |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Full product requirements |
| [docs/QUICK_START_TESTNET.md](docs/QUICK_START_TESTNET.md) | Testnet quickstart |
| [docs/QUICK_START_X402.md](docs/QUICK_START_X402.md) | x402 integration quickstart |
| [docs/TESTNET_DEPLOYMENT_GUIDE.md](docs/TESTNET_DEPLOYMENT_GUIDE.md) | Contract deployment walkthrough |
| [docs/PRD_X402_SECTION.md](docs/PRD_X402_SECTION.md) | x402 protocol integration spec |

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stacks (Bitcoin L2), Clarity v2 |
| Proxy | Express.js, x402-stacks, Winston |
| Frontend | Next.js 15, React 19, TanStack Query |
| Wallet | @stacks/connect-react, Leather |
| Styling | Vanilla CSS (custom design system) |
| Database | PostgreSQL (production), SQLite (dev) |
| Infrastructure | Docker, Terraform |

## License

MIT

## Mainnet readiness

stxact is testnet-first by default. To deploy against mainnet, see
[docs/internal/MAINNET_READINESS.md](docs/internal/MAINNET_READINESS.md) for
the full checklist and `docs/internal/TESTNET_TO_MAINNET_MIGRATION.md` for the
runbook. The webapp and proxy will refuse to start in production without an
explicit `STACKS_NETWORK` (or `NEXT_PUBLIC_STACKS_NETWORK`) value.
