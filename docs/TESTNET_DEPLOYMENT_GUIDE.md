# Testnet Deployment Guide

**Generated:** 2026-02-15 20:42
**Approach:** Deploy contracts to Stacks testnet, configure backend to use testnet
**Advantage:** No local devnet needed, faster iteration, real blockchain testing

---

## OVERVIEW

Instead of running local devnet, we'll:
1. Deploy all 4 contracts to Stacks testnet
2. Configure backend to point to testnet API
3. Use testnet wallet for testing
4. Test all flows on real blockchain

**Benefits:**
- No Clarinet devnet to manage
- Real blockchain behavior
- Persistent state between sessions
- Easier debugging with block explorers

---

## PREREQUISITES

### Required
- [ ] Stacks wallet with testnet STX (you'll configure this)
- [ ] Clarinet installed (`clarinet --version`)
- [ ] Node.js 18+ installed
- [ ] PostgreSQL running locally

### Get Testnet STX
1. Create/import wallet in Hiro Wallet
2. Switch to testnet network
3. Get testnet STX from faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
4. Wait for confirmation (~10 minutes)

---

## STEP 1: Configure Testnet Deployment (10 min)

### 1.1: Check Current Testnet Config
```bash
cd /Users/macbook/stxact/packages/contracts
cat settings/Testnet.toml
```

**Expected content:**
```toml
[network]
name = "testnet"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "<your_wallet_mnemonic>"
# OR
stx_address = "ST..."
```

### 1.2: Update Testnet.toml with Your Wallet
```bash
nano settings/Testnet.toml
```

**Add your configuration:**
```toml
[network]
name = "testnet"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "<paste_your_24_word_mnemonic_here>"
# Clarinet will derive address from mnemonic
```

**Security Note:** This file should be in `.gitignore` (verify):
```bash
grep -r "Testnet.toml" .gitignore
# Should return: settings/Testnet.toml
```

### 1.3: Verify Wallet Has Testnet STX
```bash
# Get your testnet address
clarinet accounts get deployer --network testnet

# Check balance on explorer
# Visit: https://explorer.hiro.so/address/<your_address>?chain=testnet
```

**Minimum Required:**
- Service Registry: ~0.5 STX (deployment)
- Reputation Map: ~0.5 STX (deployment)
- Dispute Resolver: ~0.5 STX (deployment)
- Receipt Anchor: ~0.3 STX (deployment)
- **Total: ~2 STX + fees**

**Recommended:** Get 10 STX from faucet to have buffer for testing

---

## STEP 2: Deploy Contracts to Testnet (20 min)

### 2.1: Check Contracts Are Valid
```bash
cd /Users/macbook/stxact/packages/contracts

# Verify all contracts compile
clarinet check

# Expected output:
# ✓ service-registry
# ✓ reputation-map
# ✓ dispute-resolver
# ✓ receipt-anchor
```

### 2.2: Create Deployment Plan
```bash
# Generate deployment plan for testnet
clarinet deployment generate --testnet
```

**This creates:** `deployments/default.testnet-plan.yaml`

**Review the plan:**
```bash
cat deployments/default.testnet-plan.yaml
```

**Expected structure:**
```yaml
---
id: 0
name: stxact-testnet
network: testnet
stacks-node: "https://api.testnet.hiro.so"
bitcoin-node: "http://blockstack:blockstacksystem@bitcoin.testnet.hiro.so:18332"
plan:
  batches:
    - id: 0
      transactions:
        - contract-publish:
            contract-name: service-registry
            expected-sender: ST...
            cost: 50000
            path: contracts/service-registry.clar
        - contract-publish:
            contract-name: reputation-map
            expected-sender: ST...
            cost: 50000
            path: contracts/reputation-map.clar
        - contract-publish:
            contract-name: dispute-resolver
            expected-sender: ST...
            cost: 50000
            path: contracts/dispute-resolver.clar
        - contract-publish:
            contract-name: receipt-anchor
            expected-sender: ST...
            cost: 50000
            path: contracts/receipt-anchor.clar
```

### 2.3: Deploy to Testnet
```bash
# Deploy all contracts
clarinet deployment apply --testnet

# This will:
# 1. Broadcast each contract deployment transaction
# 2. Wait for confirmations
# 3. Save deployment info to deployments/default.testnet-plan.yaml
```

**Expected output:**
```
✓ Broadcasting service-registry deployment...
  Transaction ID: 0xabc123...
  Waiting for confirmation...
✓ service-registry deployed at ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.service-registry

✓ Broadcasting reputation-map deployment...
  Transaction ID: 0xdef456...
  Waiting for confirmation...
✓ reputation-map deployed at ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reputation-map

✓ Broadcasting dispute-resolver deployment...
  Transaction ID: 0xghi789...
  Waiting for confirmation...
✓ dispute-resolver deployed at ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dispute-resolver

✓ Broadcasting receipt-anchor deployment...
  Transaction ID: 0xjkl012...
  Waiting for confirmation...
✓ receipt-anchor deployed at ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.receipt-anchor

✓ All contracts deployed successfully
```

**Time:** ~10-15 minutes (waiting for confirmations)

### 2.4: Extract Deployed Contract Addresses
```bash
# View deployment results
cat deployments/default.testnet-plan.yaml | grep -A 3 "contract-publish"
```

**Copy these addresses - you'll need them for Step 3:**
```
SERVICE_REGISTRY_ADDRESS=ST<deployer_address>.service-registry
REPUTATION_MAP_ADDRESS=ST<deployer_address>.reputation-map
DISPUTE_RESOLVER_ADDRESS=ST<deployer_address>.dispute-resolver
RECEIPT_ANCHOR_ADDRESS=ST<deployer_address>.receipt-anchor
```

### 2.5: Verify Deployment on Explorer
```bash
# Get your deployer address
clarinet accounts get deployer --network testnet
```

**Visit explorer:**
```
https://explorer.hiro.so/address/<deployer_address>?chain=testnet
```

**Verify:**
- [ ] All 4 contracts appear in "Contracts" tab
- [ ] Each contract shows "Deployed" status
- [ ] Transaction history shows 4 contract deployments

---

## STEP 3: Configure Backend for Testnet (15 min)

### 3.1: Update Backend .env
```bash
cd /Users/macbook/stxact/packages/proxy
nano .env
```

**Update these values:**
```bash
# Network Configuration
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so

# Contract Addresses (from Step 2.4)
SERVICE_REGISTRY_ADDRESS=ST<your_deployer>.service-registry
REPUTATION_MAP_ADDRESS=ST<your_deployer>.reputation-map
DISPUTE_RESOLVER_ADDRESS=ST<your_deployer>.dispute-resolver
RECEIPT_ANCHOR_ADDRESS=ST<your_deployer>.receipt-anchor

# Seller Configuration (your testnet wallet)
SELLER_PRIVATE_KEY=<your_testnet_private_key>
SERVICE_PRINCIPAL=ST<your_deployer_address>

# Database (local)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=stxact
POSTGRES_USER=stxact
POSTGRES_PASSWORD=<your_db_password>

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Features
ENABLE_RECEIPT_ANCHORING=true
CONFIRMATION_DEPTH=1  # Testnet: 1 block is fine for testing
```

**Save and exit:** Ctrl+X, Y, Enter

### 3.2: Update Frontend .env.local
```bash
cd /Users/macbook/stxact/packages/webapp
nano .env.local
```

**Update:**
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Stacks Network
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so

# Contract Addresses (from Step 2.4)
NEXT_PUBLIC_SERVICE_REGISTRY=ST<your_deployer>.service-registry
NEXT_PUBLIC_REPUTATION_MAP=ST<your_deployer>.reputation-map
```

**Save and exit**

### 3.3: Verify Configuration
```bash
# Test connection to testnet API
curl https://api.testnet.hiro.so/v2/info

# Should return JSON with network info
```

---

## STEP 4: Test Contract Deployment (10 min)

### 4.1: Test Contract Read Functions
```bash
cd /Users/macbook/stxact/packages/proxy

# Create test script
cat > scripts/test-testnet-contracts.ts << 'EOF'
import { callReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const network = new StacksTestnet();
const [contractAddress, contractName] = process.env.SERVICE_REGISTRY_ADDRESS!.split('.');

async function testContracts() {
  console.log('Testing contract:', process.env.SERVICE_REGISTRY_ADDRESS);
  
  try {
    // Test service registry
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-total-services',
      functionArgs: [],
      network,
      senderAddress: contractAddress,
    });
    
    console.log('✓ Service registry accessible');
    console.log('Total services:', cvToJSON(result));
    
    // Test reputation map
    const [repAddress, repName] = process.env.REPUTATION_MAP_ADDRESS!.split('.');
    const repResult = await callReadOnlyFunction({
      contractAddress: repAddress,
      contractName: repName,
      functionName: 'get-min-reputation-amount',
      functionArgs: [],
      network,
      senderAddress: repAddress,
    });
    
    console.log('✓ Reputation map accessible');
    console.log('Min reputation amount:', cvToJSON(repResult));
    
    console.log('\n✓ All contracts deployed and accessible on testnet');
  } catch (error) {
    console.error('✗ Contract test failed:', error);
    process.exit(1);
  }
}

testContracts();
EOF

# Run test
npx ts-node scripts/test-testnet-contracts.ts
```

**Expected output:**
```
Testing contract: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.service-registry
✓ Service registry accessible
Total services: 0
✓ Reputation map accessible
Min reputation amount: 10000

✓ All contracts deployed and accessible on testnet
```

### 4.2: Verify in Explorer
**For each contract, visit:**
```
https://explorer.hiro.so/txid/<contract_deployment_txid>?chain=testnet
```

**Check:**
- [ ] Transaction status: Success
- [ ] Contract deployed
- [ ] No errors in logs

---

## STEP 5: Fix Seed Data for Testnet (10 min)

### 5.1: Update Seed Data with Valid Testnet Principals
```bash
cd /Users/macbook/stxact/packages/proxy
nano infra/migrations/seed.sql
```

**Replace placeholder principals with valid testnet addresses:**

**Option A: Use your deployer address for all services**
```sql
-- Update all services to use your testnet deployer address
UPDATE services SET principal = 'ST<your_deployer_address>' WHERE id = 1;
UPDATE services SET principal = 'ST<your_deployer_address>' WHERE id = 2;
UPDATE services SET principal = 'ST<your_deployer_address>' WHERE id = 3;
```

**Option B: Use different testnet addresses (if you have multiple wallets)**
```sql
-- Service 1: Oracle
UPDATE services SET 
  principal = 'ST1TESTNET_ADDRESS_1',
  bns_name = 'oracle.btc',
  endpoint_url = 'https://oracle.example.com'
WHERE id = 1;

-- Service 2: AI Compute
UPDATE services SET 
  principal = 'ST2TESTNET_ADDRESS_2',
  bns_name = 'ai-compute.btc',
  endpoint_url = 'https://ai.example.com'
WHERE id = 2;

-- Service 3: Data API
UPDATE services SET 
  principal = 'ST3TESTNET_ADDRESS_3',
  bns_name = 'data-api.btc',
  endpoint_url = 'https://data.example.com'
WHERE id = 3;
```

### 5.2: Apply Seed Data
```bash
# Run migrations
npm run migrate:up

# Verify
psql -U stxact -d stxact -c "SELECT principal, bns_name FROM services;"
```

**Expected output:**
```
         principal          |    bns_name    
----------------------------+----------------
 ST<your_address>           | oracle.btc
 ST<your_address>           | ai-compute.btc
 ST<your_address>           | data-api.btc
```

**No checksum errors should appear**

---

## STEP 6: Register Seed Services On-Chain (20 min)

### 6.1: Create Registration Script
```bash
cd /Users/macbook/stxact/packages/proxy
cat > scripts/register-testnet-services.ts << 'EOF'
import { makeContractCall, broadcastTransaction, AnchorMode, stringAsciiCV, bufferCVFromString, someCV, noneCV, uintCV, getNonce } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import { getPool } from '../src/storage/postgres';

const network = new StacksTestnet();
const [contractAddress, contractName] = process.env.SERVICE_REGISTRY_ADDRESS!.split('.');
const privateKey = process.env.SELLER_PRIVATE_KEY!;

async function registerServices() {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM services WHERE active = true ORDER BY id');
  
  console.log(`Found ${result.rows.length} services to register`);
  
  for (const service of result.rows) {
    console.log(`\nRegistering: ${service.bns_name || service.principal}`);
    
    try {
      // Get current nonce
      const nonce = await getNonce(service.principal, network);
      console.log(`  Using nonce: ${nonce}`);
      
      const tx = await makeContractCall({
        contractAddress,
        contractName,
        functionName: 'register-service',
        functionArgs: [
          stringAsciiCV(service.endpoint_url),
          bufferCVFromString(service.policy_hash || 'default-policy-hash'),
          service.bns_name ? someCV(stringAsciiCV(service.bns_name)) : noneCV(),
          uintCV(100_000_000), // 100 STX stake
        ],
        senderKey: privateKey,
        network,
        anchorMode: AnchorMode.Any,
        fee: BigInt(10000), // 0.01 STX fee
        nonce,
      });
      
      const broadcastResponse = await broadcastTransaction(tx, network);
      
      if (broadcastResponse.error) {
        console.error(`  ✗ Error:`, broadcastResponse.error);
        console.error(`  Reason:`, broadcastResponse.reason);
      } else {
        console.log(`  ✓ Transaction broadcast: ${broadcastResponse.txid}`);
        console.log(`  View: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=testnet`);
      }
      
      // Wait 30 seconds between registrations to avoid nonce conflicts
      console.log('  Waiting 30 seconds for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
    }
  }
  
  console.log('\n✓ Registration complete');
  process.exit(0);
}

registerServices().catch(console.error);
EOF

# Make executable
chmod +x scripts/register-testnet-services.ts
```

### 6.2: Run Registration
```bash
npx ts-node scripts/register-testnet-services.ts
```

**Expected output:**
```
Found 3 services to register

Registering: oracle.btc
  Using nonce: 5
  ✓ Transaction broadcast: 0xabc123...
  View: https://explorer.hiro.so/txid/0xabc123...?chain=testnet
  Waiting 30 seconds for confirmation...

Registering: ai-compute.btc
  Using nonce: 6
  ✓ Transaction broadcast: 0xdef456...
  View: https://explorer.hiro.so/txid/0xdef456...?chain=testnet
  Waiting 30 seconds for confirmation...

Registering: data-api.btc
  Using nonce: 7
  ✓ Transaction broadcast: 0xghi789...
  View: https://explorer.hiro.so/txid/0xghi789...?chain=testnet
  Waiting 30 seconds for confirmation...

✓ Registration complete
```

**Time:** ~2-3 minutes (30 seconds per service)

### 6.3: Verify Registrations
```bash
# Query contract for total services
npx ts-node scripts/test-testnet-contracts.ts
```

**Expected:**
```
Total services: 3
```

**Or check in explorer:**
```
https://explorer.hiro.so/address/ST<your_deployer>/service-registry?chain=testnet
```

---

## STEP 7: Start Services and Test (15 min)

### 7.1: Start Backend
```bash
cd /Users/macbook/stxact/packages/proxy

# Start in development mode
npm run dev
```

**Expected output:**
```
[INFO] Server starting...
[INFO] Connected to PostgreSQL
[INFO] Connected to Redis
[INFO] Stacks network: testnet
[INFO] Stacks API: https://api.testnet.hiro.so
[INFO] Service registry: ST<your_deployer>.service-registry
[INFO] Server listening on port 3001
```

**Check for errors:**
- ✅ No "Contract not found" errors
- ✅ No "Invalid principal" errors
- ✅ No connection errors

### 7.2: Start Frontend
```bash
# In new terminal
cd /Users/macbook/stxact/packages/webapp

# Start development server
npm run dev
```

**Expected output:**
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Ready in 2.3s
```

### 7.3: Test Service Directory
```bash
# Test backend API
curl http://localhost:3001/directory/services

# Should return 3 services
```

**Or open in browser:**
```
http://localhost:3000/directory
```

**Verify:**
- [ ] 3 services displayed
- [ ] Each service shows correct principal
- [ ] BNS names displayed
- [ ] No errors in console

---

## STEP 8: Configure Wallet for Testing (10 min)

### 8.1: Install Hiro Wallet
1. Open Chrome/Brave
2. Go to Chrome Web Store
3. Search "Hiro Wallet"
4. Install extension
5. Pin to toolbar

### 8.2: Configure for Testnet
1. Open Hiro Wallet
2. Click Settings → Network
3. Select "Testnet"
4. Verify URL: `https://api.testnet.hiro.so`

### 8.3: Import Your Wallet
**Option A: Import existing wallet**
1. Click "Import existing wallet"
2. Enter your 24-word mnemonic (same as in Testnet.toml)
3. Set password
4. Verify address matches deployer address

**Option B: Create new wallet for testing**
1. Create new wallet
2. Save mnemonic
3. Get testnet STX from faucet
4. Use this wallet for buyer testing

### 8.4: Verify Balance
- Deployer wallet should have remaining STX after deployments
- Buyer wallet should have testnet STX from faucet

---

## STEP 9: Test Complete Flow (20 min)

### 9.1: Test Service Registration (Already Done ✓)
- Services registered in Step 6
- Verify in directory

### 9.2: Test Payment Flow
```bash
# Trigger the paid proxy endpoint and capture the receipt
stxact curl http://localhost:3001/demo/premium-data \
  --wallet /path/to/testnet-wallet.json \
  --verify \
  --output receipt.json
```

**Verify in web app:**
1. Open `http://localhost:3000/receipts/verify`
2. Paste the receipt JSON from `receipt.json`
3. Run verification and confirm on-chain checks pass

**Repeatable end-to-end verification:**
```bash
STXACT_BUYER_WALLET=/path/to/buyer-wallet.json \
STXACT_SELLER_WALLET=/path/to/seller-wallet.json \
node scripts/verify-testnet-e2e.mjs
```

**Verify receipt:**
```bash
# Re-run receipt verification from the CLI against the saved response
stxact verify-receipt receipt.json --on-chain
```

### 9.3: Test Receipt Verification
```bash
# Get receipt from database
RECEIPT_ID=$(psql -U stxact -d stxact -t -c "SELECT receipt_id FROM receipts ORDER BY created_at DESC LIMIT 1;")

# Verify signature
curl -X POST http://localhost:3001/receipts/verify \
  -H "Content-Type: application/json" \
  -d "{\"receipt_id\": \"$RECEIPT_ID\"}"
```

**Expected:**
```json
{
  "valid": true,
  "checks": {
    "signature_valid": true,
    "principal_match": true,
    "payment_confirmed": true
  }
}
```

### 9.4: Test Dispute Flow
```bash
# Create dispute
curl -X POST http://localhost:3001/disputes \
  -H "Content-Type: application/json" \
  -d "{
    \"receipt_id\": \"$RECEIPT_ID\",
    \"reason\": \"delivery_hash_mismatch\",
    \"evidence\": {
      \"notes\": \"Test dispute\"
    }
  }"
```

**Expected:**
```json
{
  "dispute_id": "...",
  "status": "open",
  "resolution_deadline": ...
}
```

---

## SUCCESS CRITERIA

### Deployment Complete When:
- [x] All 4 contracts deployed to testnet
- [x] Contract addresses extracted
- [x] Backend configured for testnet
- [x] Frontend configured for testnet
- [x] Seed data fixed (no checksum errors)
- [x] Services registered on-chain
- [x] Backend connects to testnet without errors
- [x] Wallet configured and funded

### Testing Complete When:
- [ ] Can browse services at localhost:3000/directory
- [ ] Can make payment and receive receipt
- [ ] Receipt signature verifies correctly
- [ ] Can create dispute
- [ ] No errors in backend logs
- [ ] No errors in browser console

---

## TROUBLESHOOTING

### Issue: Contract deployment fails
**Symptoms:** Transaction rejected, insufficient funds
**Fix:**
```bash
# Check wallet balance
clarinet accounts get deployer --network testnet

# Get more testnet STX
# Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet
```

### Issue: Nonce too low error
**Symptoms:** "nonce too low" when registering services
**Fix:**
```bash
# Wait 30 seconds between transactions
# Or manually increment nonce in script
```

### Issue: Backend can't connect to contracts
**Symptoms:** "Contract not found" errors
**Fix:**
```bash
# Verify contract addresses in .env match deployed contracts
cat deployments/default.testnet-plan.yaml | grep "contract-name"

# Update .env with correct addresses
nano packages/proxy/.env
```

### Issue: Payment fails
**Symptoms:** Wallet rejects transaction
**Fix:**
```bash
# Verify wallet on testnet network
# Verify wallet has STX balance
# Check backend logs for actual error
tail -f /tmp/backend.log
```

---

## NEXT STEPS AFTER TESTNET DEPLOYMENT

1. **Test all flows thoroughly**
   - Service registration
   - Payment processing
   - Receipt generation
   - Dispute creation
   - Refund execution

2. **Monitor testnet transactions**
   - Use explorer to verify all transactions
   - Check for any failed transactions
   - Monitor gas costs

3. **Iterate and fix bugs**
   - Document any issues found
   - Fix bugs in code
   - Redeploy if needed

4. **Prepare for mainnet**
   - Security audit
   - Load testing
   - Final code review
   - Mainnet deployment plan

---

**This guide provides a complete path to deploy and test on Stacks testnet. No local devnet needed - everything runs on real blockchain infrastructure.**
