# Mainnet Readiness Checklist

This document tracks the cutover work required to flip stxact from testnet to mainnet.

## Required environment overrides

- `STACKS_NETWORK=mainnet` (proxy + cli)
- `NEXT_PUBLIC_STACKS_NETWORK=mainnet` (webapp)
- `SERVICE_REGISTRY_ADDRESS=<SP-deployed-mainnet-address>.service-registry`
- `REPUTATION_MAP_ADDRESS=<SP-deployed-mainnet-address>.reputation-map`
- `DISPUTE_RESOLVER_ADDRESS=<SP-deployed-mainnet-address>.dispute-resolver`
- `RECEIPT_ANCHOR_ADDRESS=<SP-deployed-mainnet-address>.receipt-anchor` (optional)

## Verified safe

- Network resolution centralized in `packages/{webapp,proxy}/src/{lib,config}/network.ts`
- Token contracts (sBTC, BNS) selected per network
- Confirmation depth defaults to 6 on mainnet, 1 on testnet
- CSP `connect-src` allows only the active network's Hiro API
- Address validation rejects opposite-network principals
- Webapp `EnvironmentWarning` banner appears on testnet deployments only

## Manual verification before flip

1. Deploy contracts to mainnet via `clarinet deployments apply`
2. Verify deployed contract addresses in Stacks Explorer
3. Capture deployment block heights for receipt anchoring baseline
4. Update env vars on proxy + webapp deployments
5. Run end-to-end smoke test against mainnet (low-value sBTC payment)
6. Verify receipt PDF watermark reads `MAINNET`
7. Verify CSP via browser devtools → Network tab → response headers
