# Testnet → Mainnet Migration Runbook

## 1. Pre-flight

- Confirm contracts compiled and `clarinet check` clean
- Confirm enough STX in mainnet deployer wallet for fees
- Backup all deployer keys to a secure store

## 2. Deploy contracts

```bash
cd packages/contracts
clarinet deployments generate --network mainnet --plan deployments/default.mainnet-plan.yaml
clarinet deployments apply --plan deployments/default.mainnet-plan.yaml
```

Capture deployed contract addresses from the plan output.

## 3. Update environment

For each deployment target, set:

- `STACKS_NETWORK=mainnet`
- `NEXT_PUBLIC_STACKS_NETWORK=mainnet`
- `{SERVICE_REGISTRY,REPUTATION_MAP,DISPUTE_RESOLVER,RECEIPT_ANCHOR}_ADDRESS=<deployed-address>.<contract-name>`

## 4. Smoke test

- Hit `/health` → expect `{ network: "mainnet" }`
- Make low-value test payment via x402 → expect receipt
- Verify receipt PDF watermark reads `MAINNET`
- Verify Hiro Explorer URLs in receipts use `chain=mainnet`

## 5. Roll out

- Deploy proxy first (signs receipts using new contracts)
- Deploy webapp second (consumes proxy)
- Monitor reputation update logs for first hour

## 6. Rollback

If anything looks wrong, revert env vars to testnet contract addresses. Receipts already issued under mainnet remain valid (signed and anchored); they will simply not be queryable from a testnet-configured proxy.
