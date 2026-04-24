import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.5.4/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

/**
 * Test: reputation-map.clar
 * PRD Reference: Section 12 - Reputation System
 */

Clarinet.test({
  name: 'Logarithmic scoring: 10k sats → +14 points',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;
    const receiptHash = '0x' + 'a'.repeat(64);
    const paymentAmount = 10_000; // 10,000 sats (minimum)

    // Initialize reputation
    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'initialize-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    // Record successful delivery
    const block = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Get reputation
    const repBlock = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'get-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    const reputation = repBlock.receipts[0].result.expectOk().expectSome().expectTuple();
    // Score should be u14 for 10,000 sats (floor(log2(10001)) = 13.something ≈ 14)
    // Actual value depends on threshold ladder implementation
    assertEquals(reputation['score'], types.uint(14));
  },
});

Clarinet.test({
  name: 'Logarithmic scoring: 100k sats → +17 points',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;
    const receiptHash = '0x' + 'b'.repeat(64);
    const paymentAmount = 100_000; // 100,000 sats

    // Initialize reputation
    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'initialize-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    // Record successful delivery
    const block = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Get reputation
    const repBlock = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'get-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    const reputation = repBlock.receipts[0].result.expectOk().expectSome().expectTuple();
    assertEquals(reputation['score'], types.uint(17));
  },
});

Clarinet.test({
  name: 'Logarithmic scoring: 1M sats → +20 points',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;
    const receiptHash = '0x' + 'c'.repeat(64);
    const paymentAmount = 1_000_000; // 1M sats

    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'initialize-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    const repBlock = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'get-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    const reputation = repBlock.receipts[0].result.expectOk().expectSome().expectTuple();
    assertEquals(reputation['score'], types.uint(20));
  },
});

Clarinet.test({
  name: 'Logarithmic scoring: 2M sats → +21 points (capped)',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;
    const receiptHash = '0x' + 'd'.repeat(64);
    const paymentAmount = 2_000_000; // 2M sats (> 1,048,576 threshold)

    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'initialize-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    const repBlock = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'get-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    const reputation = repBlock.receipts[0].result.expectOk().expectSome().expectTuple();
    // Capped at u21 for payments >= 1,048,576 sats
    assertEquals(reputation['score'], types.uint(21));
  },
});

Clarinet.test({
  name: 'Cannot record same receipt twice (double-count protection)',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;
    const receiptHash = '0x' + 'e'.repeat(64);
    const paymentAmount = 10_000;

    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'initialize-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    // First recording (should succeed)
    let block = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Second recording (should fail with conflict error)
    block = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(409); // ERR-CONFLICT
  },
});

Clarinet.test({
  name: 'Cannot record delivery with payment below minimum (10k sats)',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const seller = accounts.get('wallet_1')!;
    const receiptHash = '0x' + 'f'.repeat(64);
    const paymentAmount = 9_999; // Below 10,000 sats minimum

    chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'initialize-reputation',
        [types.principal(seller.address)],
        seller.address
      ),
    ]);

    const block = chain.mineBlock([
      Tx.contractCall(
        'reputation-map',
        'record-successful-delivery',
        [
          types.principal(seller.address),
          types.buff(Buffer.from(receiptHash.slice(2), 'hex')),
          types.uint(paymentAmount),
        ],
        seller.address
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(422); // ERR-INVALID-AMOUNT
  },
});


/**
 * Branded type for safely distinguishing test principals from raw strings.
 */
export type TestPrincipal = string & { readonly __brand: 'TestPrincipal' };
