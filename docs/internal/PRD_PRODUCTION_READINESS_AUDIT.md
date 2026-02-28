# PRD Production Readiness Audit

Date: 2026-02-28

## Verdict

`NOT YET PRODUCTION-READY` against PRD Section 20 acceptance criteria.

## What Is Implemented

- Frontend required pages exist and are API-backed:
  - `/directory` and `/directory/[principal]`
  - `/receipts/verify` and `/receipts/[id]`
  - `/disputes` and `/disputes/[id]`
- CLI command surface implemented:
  - `stxact curl` (wallet-backed x402 auto-pay flow wiring)
  - `stxact verify-receipt`
  - `stxact dispute create`
  - `stxact dispute status`
  - `stxact list-services` (`table|json|csv`)
- OpenAPI spec published: `docs/api/openapi.yaml`
- Integration guide published with TypeScript/Python/Go examples: `docs/INTEGRATION_GUIDE.md`
- Directory API compatibility hardened:
  - Token filter alias support (`supported_token` and `token`)
  - Service lookup by principal or BNS name
- Demo API routes are now explicitly gated for production safety via `ENABLE_DEMO_ROUTES`.

## Remaining Gaps To Satisfy PRD Acceptance Criteria

1. End-to-end verification evidence is missing:
   - Live facilitator integration test coverage still incomplete (`test.skip` paths remain).
   - Full buyer flow proof (402 -> pay -> retry -> receipt -> on-chain confirmation) not validated in this environment.

2. Reliability criteria not yet met in code/ops:
   - Facilitator-downtime code fallback is implemented, but not validated with live integration evidence yet.
   - Uptime/SLA, replication, and backup automation criteria are not proven by repository tests/config alone.

3. Security/compliance criteria require additional evidence:
   - External security audit evidence not present.
   - Institutional retention/compliance controls are partially implemented but not fully validated end-to-end.

4. Toolchain blocker in current environment:
   - Node/npm unavailable here, so build/test execution could not be run to produce pass/fail artifacts.

## Next Highest-Impact Work

- Implement facilitator-downtime fallback verification path in payment gate.
- Convert skipped integration tests into runnable flows (or add deterministic mocks where needed).
- Execute full CI evidence run (build, test, integration, load/perf smoke) in a Node-enabled environment.
