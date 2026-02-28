# stxact Implementation Task List (Docs as Source of Truth)

Status date: 2026-02-27

## Completed (Backend Core)

- [x] Enforce signed service registration in `POST /directory/register`
- [x] Verify canonical registration message and seller principal recovery
- [x] Pass correct `buff 32` endpoint/policy hashes to `service-registry.clar::register-service`
- [x] Fix x402 receipt prerequisites: propagate confirmed `block_height` and `block_hash`
- [x] Populate `buyer_principal` in generated receipts from verified payment data
- [x] Guard idempotency response caching when `X-Idempotency-Key` is missing
- [x] Align receipt anchoring code with deployed contract (`anchor-receipt`, not batch method)
- [x] Make signature recovery network-aware (`SP` mainnet vs `ST` testnet)
- [x] Fix reputation read-only query (`get-reputation`) and optional response parsing
- [x] Fix nonce manager force-resync pending-clear bug
- [x] Implement on-chain dispute creation via `dispute-resolver.clar::create-dispute`
- [x] Add buyer-signature validation path for disputes (with optional enforcement flag)
- [x] Harden refund execution input validation and on-chain argument encoding
- [x] Patch schema gaps required by runtime (`metadata`, `used_payments`, `reputation_events`, `refund_authorizations`)

## Remaining (Production Completion)

- [x] Replace webapp mock/hardcoded data flows in core app routes with API-backed flows
- [x] Align webapp payment flow component with official x402-stacks client wrapper flow
- [x] Fix webapp registration flow to use signed backend registration (no browser contract broadcast)
- [x] Replace direct contract calls in dispute/receipt seller actions with backend API flows
- [x] Remove/retire dead middleware paths (`verify-payment.ts`, `x402-challenge.ts`) if no longer used
- [x] Implement CLI commands referenced by PRD (`stxact curl`, `verify-receipt`, `dispute create`, `list-services`)
- [x] Add migration runner and formal versioned migrations (not just monolithic `schema.sql`)
- [ ] Add backend integration tests for register -> paid request -> receipt -> dispute -> refund flow
- [ ] Add contract interaction tests for hash/type correctness (`buff` lengths, UUID buffers, txid normalization)
- [x] Validate webapp and proxy env defaults for testnet-first deployment

## Environment/Test Blockers Found

- [ ] Node.js toolchain binaries are not available in this environment (`node`, `npm`, `npx`, `git` missing), so TypeScript compile/test verification could not be executed here.
