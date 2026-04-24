import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.5.4/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

/**
 * Test: service-registry.clar
 * PRD Reference: Section 13 - Service Directory
 */

Clarinet.test({
  name: 'Can register service with valid stake',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const seller = accounts.get('wallet_1')!;

    const endpointHash = '0x' + 'a'.repeat(64);
    const policyHash = '0x' + 'b'.repeat(64);
    const stakeAmount = 100_000_000; // 100 STX

    const block = chain.mineBlock([
      Tx.contractCall(
        'service-registry',
        'register-service',
        [
          types.buff(Buffer.from(endpointHash.slice(2), 'hex')),
          types.buff(Buffer.from(policyHash.slice(2), 'hex')),
          types.none(),
          types.uint(stakeAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: 'Cannot register service with insufficient stake',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;

    const endpointHash = '0x' + 'a'.repeat(64);
    const policyHash = '0x' + 'b'.repeat(64);
    const insufficientStake = 50_000_000; // 50 STX (< 100 STX minimum)

    const block = chain.mineBlock([
      Tx.contractCall(
        'service-registry',
        'register-service',
        [
          types.buff(Buffer.from(endpointHash.slice(2), 'hex')),
          types.buff(Buffer.from(policyHash.slice(2), 'hex')),
          types.none(),
          types.uint(insufficientStake),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(422); // ERR-INVALID-STAKE
  },
});

Clarinet.test({
  name: 'Cannot register same principal twice',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;

    const endpointHash = '0x' + 'a'.repeat(64);
    const policyHash = '0x' + 'b'.repeat(64);
    const stakeAmount = 100_000_000;

    // First registration
    let block = chain.mineBlock([
      Tx.contractCall(
        'service-registry',
        'register-service',
        [
          types.buff(Buffer.from(endpointHash.slice(2), 'hex')),
          types.buff(Buffer.from(policyHash.slice(2), 'hex')),
          types.none(),
          types.uint(stakeAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Second registration (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        'service-registry',
        'register-service',
        [
          types.buff(Buffer.from(endpointHash.slice(2), 'hex')),
          types.buff(Buffer.from(policyHash.slice(2), 'hex')),
          types.none(),
          types.uint(stakeAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(409); // ERR-CONFLICT
  },
});

Clarinet.test({
  name: 'Can retrieve registered service',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;

    const endpointHash = '0x' + 'a'.repeat(64);
    const policyHash = '0x' + 'b'.repeat(64);
    const stakeAmount = 100_000_000;

    // Register service
    chain.mineBlock([
      Tx.contractCall(
        'service-registry',
        'register-service',
        [
          types.buff(Buffer.from(endpointHash.slice(2), 'hex')),
          types.buff(Buffer.from(policyHash.slice(2), 'hex')),
          types.none(),
          types.uint(stakeAmount),
        ],
        seller.address
      ),
    ]);

    // Get service
    const block = chain.mineBlock([
      Tx.contractCall(
        'service-registry',
        'get-service',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    const result = block.receipts[0].result.expectOk().expectSome();
    // Verify service data is present
  },
});


/**
 * Readonly context isolating contract state variables during test runs.
 */
export interface ContractTestContext { readonly chainId: number; readonly sender: string; }
