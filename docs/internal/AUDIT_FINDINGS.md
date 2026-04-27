# Code Audit Findings — Testnet → Mainnet

## Resolved during audit

- **Silent testnet fallback**: 10+ callsites previously defaulted to `'testnet'` when env was missing. All now go through a centralized `network` module that fails fast in production (`packages/{webapp,proxy}/src/{lib,config}/network.ts`).
- **Hardcoded sBTC contract**: Two callsites in proxy used the mainnet sBTC contract ID regardless of configured network. Now resolved through `token-contracts` module.
- **Hardcoded BNS contract**: BNS resolution used mainnet `SP000000000000000000002Q6VF78` even on testnet. Now switches to `ST000000000000000000002AMW42H` on testnet.
- **STACKS_ADDRESS_REGEX accepted only mainnet**: regex was `^S[PM]…` which rejected testnet `ST*`/`SN*` principals. Now permits both, with separate `STACKS_MAINNET_ADDRESS_REGEX` and `STACKS_TESTNET_ADDRESS_REGEX` for network-aware checks.
- **CSP allow-listed both networks**: webapp middleware previously allowed both `api.mainnet.hiro.so` and `api.testnet.hiro.so` in `connect-src`. Now allows only the active network's API.
- **Missing confirmation depth wiring**: env had `CONFIRMATION_DEPTH_{MAINNET,TESTNET}` but no resolver consumed them. Added `getConfirmationDepth()` and `isConfirmedAtDepth()`.
- **PDF watermark**: receipt PDF watermark fell back to `TESTNET` when env missing — now derived from centralized network module.

## Tests added

- 30+ new unit tests covering network resolution, token contracts, address validation, CSP, confirmation depth, replay window, idempotency, retry, and structured logging.
- React hook tests for `useNetwork`, `useIsMainnet`, `useDebounce`, `useMediaQuery`, `useScrollLock`, `useHydrated`, `usePrevious`, `useCurrentEpochSeconds`.
- Component tests for `NetworkBadge`, `EnvironmentWarning`, `NetworkFooter`.

## Known follow-ups

- Sentry / observability tagging by network not yet wired through (`network-logger.ts` is the foundation).
- Mainnet contract addresses in `Mainnet.toml` must be filled before `clarinet deployments apply`.
- Mainnet smoke test against deployed proxy not yet automated.
