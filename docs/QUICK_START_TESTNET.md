# Quick Start: Testnet Deployment

**Status:** Ready to deploy to testnet
**Time Required:** 30-45 minutes
**Your Action Required:** Configure wallet mnemonic

---

## IMMEDIATE NEXT STEPS

### Step 1: Configure Your Wallet (5 min)

```bash
# 1. Edit Testnet.toml with your mnemonic
nano /Users/macbook/stxact/packages/contracts/settings/Testnet.toml

# 2. Replace this line:
mnemonic = "YOUR_24_WORD_MNEMONIC_HERE"

# 3. With your actual 24-word mnemonic (space-separated)
mnemonic = "word1 word2 word3 ... word24"

# 4. Save and exit (Ctrl+X, Y, Enter)
```

**Get Testnet STX:**
- Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet
- Request testnet STX (need ~10 STX for deployment + testing)
- Wait ~10 minutes for confirmation

### Step 2: Verify Configuration (2 min)

```bash
cd /Users/macbook/stxact/packages/contracts

# Check your deployer address
clarinet accounts get deployer --network testnet

# Verify contracts compile
clarinet check
```

**Expected output:**
```
✓ service-registry
✓ reputation-map
✓ dispute-resolver  
✓ receipt-anchor
```

### Step 3: Deploy Contracts (15 min)

```bash
# Generate deployment plan
clarinet deployment generate --testnet

# Review the plan
cat deployments/default.testnet-plan.yaml

# Deploy to testnet
clarinet deployment apply --testnet
```

**This will:**
1. Broadcast 4 contract deployment transactions
2. Wait for confirmations (~2-3 min each)
3. Save deployment info

**Expected time:** 10-15 minutes total

### Step 4: Extract Contract Addresses (2 min)

```bash
# View deployed addresses
cat deployments/default.testnet-plan.yaml | grep -A 2 "contract-publish"

# Copy these addresses - you'll need them next
```

**You should see:**
```
contract-name: service-registry
expected-sender: ST<your_address>
---
contract-name: reputation-map
expected-sender: ST<your_address>
---
contract-name: dispute-resolver
expected-sender: ST<your_address>
---
contract-name: receipt-anchor
expected-sender: ST<your_address>
```

### Step 5: Configure Backend (5 min)

```bash
# Edit backend .env
nano /Users/macbook/stxact/packages/proxy/.env
```

**Update these lines:**
```bash
# Network
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so

# Contract Addresses (paste from Step 4)
SERVICE_REGISTRY_ADDRESS=ST<your_address>.service-registry
REPUTATION_MAP_ADDRESS=ST<your_address>.reputation-map
DISPUTE_RESOLVER_ADDRESS=ST<your_address>.dispute-resolver
RECEIPT_ANCHOR_ADDRESS=ST<your_address>.receipt-anchor

# Your wallet
SELLER_PRIVATE_KEY=<your_private_key>
SERVICE_PRINCIPAL=ST<your_address>
```

**Save and exit**

### Step 6: Start Services (2 min)

```bash
# Terminal 1: Start backend
cd /Users/macbook/stxact/packages/proxy
npm run dev

# Terminal 2: Start frontend
cd /Users/macbook/stxact/packages/webapp
npm run dev
```

**Verify:**
- Backend: http://localhost:3001/health
- Frontend: http://localhost:3000

### Step 7: Test (5 min)

```bash
# Test contract connection
curl http://localhost:3001/.well-known/stxact-config

# Should return service configuration
```

**Open browser:**
- http://localhost:3000/directory (should show empty directory)
- http://localhost:3000/demo (should show demo page)

---

## VERIFICATION CHECKLIST

After completing all steps:

- [ ] Testnet.toml configured with your mnemonic
- [ ] Wallet has testnet STX (check on explorer)
- [ ] All 4 contracts deployed to testnet
- [ ] Contract addresses copied
- [ ] Backend .env updated with contract addresses
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:3001/health
- [ ] Can access http://localhost:3000

---

## WHAT YOU'LL SEE

### Successful Deployment Output:
```
✓ Broadcasting service-registry deployment...
  Transaction ID: 0xabc123...
  Waiting for confirmation...
✓ service-registry deployed at ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.service-registry

✓ Broadcasting reputation-map deployment...
  Transaction ID: 0xdef456...
  Waiting for confirmation...
✓ reputation-map deployed at ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reputation-map

... (2 more contracts)

✓ All contracts deployed successfully
```

### Backend Startup:
```
[INFO] Server starting...
[INFO] Connected to PostgreSQL
[INFO] Stacks network: testnet
[INFO] Stacks API: https://api.testnet.hiro.so
[INFO] Service registry: ST<your_address>.service-registry
[INFO] Server listening on port 3001
```

---

## TROUBLESHOOTING

### "Insufficient funds" error
**Fix:** Get more testnet STX from faucet
```
https://explorer.hiro.so/sandbox/faucet?chain=testnet
```

### "Invalid mnemonic" error
**Fix:** Verify mnemonic is 24 words, space-separated, no quotes

### "Contract not found" error
**Fix:** Verify contract addresses in .env match deployed addresses
```bash
cat deployments/default.testnet-plan.yaml | grep "expected-sender"
```

### Backend won't start
**Fix:** Check PostgreSQL is running
```bash
psql -U stxact -d stxact -c "SELECT 1;"
```

---

## AFTER DEPLOYMENT

Once everything is running:

1. **Register seed services** (see TESTNET_DEPLOYMENT_GUIDE.md Step 6)
2. **Configure wallet** for testing (see Step 8)
3. **Test payment flow** (see Step 9)

---

## FILES TO REFERENCE

- **Full Guide:** `TESTNET_DEPLOYMENT_GUIDE.md` (complete step-by-step)
- **Gap Analysis:** `LOCAL_DEPLOYMENT_GAPS_AND_FIX_PLAN.md` (what was missing)
- **Summary:** `DEPLOYMENT_READINESS_SUMMARY.md` (current state)

---

**You're ready to deploy! Start with Step 1: Configure your wallet mnemonic in Testnet.toml**
