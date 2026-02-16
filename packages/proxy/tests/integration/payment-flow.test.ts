import request from 'supertest';
import { app } from '../../src/index';
import { getPool } from '../../src/storage/db';

/**
 * Integration Test: Full Payment Flow
 *
 * Tests the complete x402 payment flow from initial 402 challenge
 * through payment verification to receipt generation.
 *
 * PRD Reference: Section 7 - API Flows
 */

describe('Payment Flow Integration', () => {
  const testEndpoint = '/demo/premium-data';
  let paymentTxid: string;
  let requestHash: string;

  beforeEach(async () => {
    // Clean up test data
    const pool = getPool();
    await pool.query('DELETE FROM used_payments WHERE payment_txid LIKE $1', ['test-%']);
    await pool.query('DELETE FROM receipts WHERE payment_txid LIKE $1', ['test-%']);

    // Generate unique test identifiers
    paymentTxid = `test-payment-${Date.now()}`;
    requestHash = `test-request-${Date.now()}`;
  });

  describe('Flow 1: Unpaid Request → 402 Challenge', () => {
    test('should return 402 with payment-required header', async () => {
      // #given: User has no payment

      // #when: User requests protected endpoint
      const response = await request(app)
        .get(testEndpoint)
        .expect(402);

      // #then: Server returns payment challenge
      expect(response.headers['payment-required']).toBeDefined();

      // Decode and verify payment-required header
      const paymentReq = JSON.parse(
        Buffer.from(response.headers['payment-required'], 'base64').toString()
      );

      expect(paymentReq.x402Version).toBe(2);
      expect(paymentReq.accepts).toHaveLength(1);
      expect(paymentReq.accepts[0].network).toMatch(/^stacks:(1|2147483648)$/); // CAIP-2 format
      expect(paymentReq.accepts[0].asset).toBe('STX');
    });

    test('should include stxact-specific headers in challenge', async () => {
      // #when: User requests protected endpoint
      const response = await request(app)
        .get(testEndpoint)
        .expect(402);

      // #then: Response includes stxact request hash
      expect(response.headers['x-stxact-request-hash']).toBeDefined();
      expect(response.headers['x-stxact-service-principal']).toBeDefined();
    });
  });

  describe('Flow 2: Payment Signature Verification', () => {
    test('should reject request with missing payment-signature header', async () => {
      // #given: User has payment but doesn't send signature

      // #when: User retries without payment-signature
      const response = await request(app)
        .get(testEndpoint)
        .expect(402);

      // #then: Server still returns 402
      expect(response.headers['payment-required']).toBeDefined();
    });

    // Note: Full payment verification requires x402-stacks facilitator integration
    // In production, this would test actual facilitator communication
    test.skip('should accept valid payment-signature and verify with facilitator', async () => {
      // This test requires:
      // 1. Mocking x402-stacks facilitator responses
      // 2. Valid Stacks transaction signature
      // 3. Integration with testnet or mock blockchain
      //
      // Implementation deferred to E2E testing with real facilitator
    });
  });

  describe('Flow 3: Payment Binding (Replay Protection)', () => {
    beforeEach(async () => {
      // Insert a used payment
      const pool = getPool();
      await pool.query(
        'INSERT INTO used_payments (payment_txid, request_hash) VALUES ($1, $2)',
        [paymentTxid, requestHash]
      );
    });

    test('should allow idempotent retry with same request hash', async () => {
      // #given: Payment already used for request A
      const pool = getPool();

      // #when: Same request retried
      const { verifyPaymentBinding } = await import('../../src/crypto/payment-binding');

      // #then: Should not throw (idempotent)
      await expect(
        verifyPaymentBinding(paymentTxid, requestHash)
      ).resolves.not.toThrow();
    });

    test('should block replay with different request hash', async () => {
      // #given: Payment already used for request A
      const differentHash = 'different-request-hash';

      // #when: Payment reused for request B
      const { verifyPaymentBinding } = await import('../../src/crypto/payment-binding');

      // #then: Should throw PaymentBindingError
      await expect(
        verifyPaymentBinding(paymentTxid, differentHash)
      ).rejects.toThrow('already used for different request');
    });
  });

  describe('Flow 4: Receipt Generation', () => {
    test.skip('should generate cryptographic receipt after successful payment', async () => {
      // #given: User has valid payment
      // (Requires mocking x402 facilitator verification)

      // #when: Payment verified

      // #then: Response should include receipt headers
      // expect(response.headers['x-stxact-receipt-id']).toBeDefined();
      // expect(response.headers['x-stxact-receipt']).toBeDefined();
      // expect(response.headers['x-stxact-signature']).toBeDefined();

      // Decode and verify receipt structure
      // const receipt = JSON.parse(
      //   Buffer.from(response.headers['x-stxact-receipt'], 'base64').toString()
      // );
      // expect(receipt.receipt_id).toBeDefined();
      // expect(receipt.payment_txid).toBe(paymentTxid);
      // expect(receipt.seller_principal).toBe(process.env.SERVICE_PRINCIPAL);
      // expect(receipt.signature).toBeDefined();
    });

    test('should store receipt in database with permanent retention', async () => {
      // #given: Receipt generated
      const receiptId = 'test-receipt-id';
      const pool = getPool();

      const { signReceipt } = await import('../../src/crypto/signatures');
      const receipt = {
        receipt_id: receiptId,
        request_hash: requestHash,
        payment_txid: paymentTxid,
        seller_principal: process.env.SERVICE_PRINCIPAL!,
        seller_bns_name: null,
        buyer_principal: 'ST1234567890ABCDEF',
        delivery_commitment: 'sha256-abc123',
        timestamp: Math.floor(Date.now() / 1000),
        block_height: 12345,
        block_hash: 'block-hash-abc',
        key_version: 1,
        revision: 0,
        service_policy_hash: 'policy-hash',
      };

      const signature = signReceipt(receipt, process.env.SELLER_PRIVATE_KEY!);

      // #when: Receipt stored
      await pool.query(
        `INSERT INTO receipts (
          receipt_id, request_hash, payment_txid, seller_principal,
          buyer_principal, delivery_commitment, timestamp, block_height,
          block_hash, key_version, revision, service_policy_hash, signature
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          receiptId, requestHash, paymentTxid, receipt.seller_principal,
          receipt.buyer_principal, receipt.delivery_commitment, receipt.timestamp,
          receipt.block_height, receipt.block_hash, receipt.key_version,
          receipt.revision, receipt.service_policy_hash, signature,
        ]
      );

      // #then: Receipt should be retrievable
      const result = await pool.query(
        'SELECT * FROM receipts WHERE receipt_id = $1',
        [receiptId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].payment_txid).toBe(paymentTxid);
      expect(result.rows[0].signature).toBe(signature);
    });
  });

  describe('Flow 5: Receipt Verification (Public Endpoint)', () => {
    test('should verify valid receipt signature', async () => {
      // #given: User has receipt
      const receipt = {
        receipt_id: 'test-receipt-verify',
        request_hash: 'test-hash',
        payment_txid: 'test-txid',
        seller_principal: process.env.SERVICE_PRINCIPAL!,
        seller_bns_name: null,
        buyer_principal: 'ST1234567890ABCDEF',
        delivery_commitment: 'sha256-deliverable',
        timestamp: Math.floor(Date.now() / 1000),
        block_height: 12345,
        block_hash: 'block-hash',
        key_version: 1,
        revision: 0,
        service_policy_hash: 'policy-hash',
      };

      const { signReceipt } = await import('../../src/crypto/signatures');
      const signature = signReceipt(receipt, process.env.SELLER_PRIVATE_KEY!);

      const signedReceipt = { ...receipt, signature };

      // #when: User verifies receipt
      const response = await request(app)
        .post('/receipts/verify')
        .send({ receipt: signedReceipt })
        .expect(200);

      // #then: Signature is valid
      expect(response.body.valid).toBe(true);
      expect(response.body.seller_principal).toBe(process.env.SERVICE_PRINCIPAL);
    });

    test('should reject receipt with invalid signature', async () => {
      // #given: User has receipt with wrong signature
      const receipt = {
        receipt_id: 'test-receipt-invalid',
        request_hash: 'test-hash',
        payment_txid: 'test-txid',
        seller_principal: process.env.SERVICE_PRINCIPAL!,
        seller_bns_name: null,
        buyer_principal: 'ST1234567890ABCDEF',
        delivery_commitment: 'sha256-deliverable',
        timestamp: Math.floor(Date.now() / 1000),
        block_height: 12345,
        block_hash: 'block-hash',
        key_version: 1,
        revision: 0,
        service_policy_hash: 'policy-hash',
        signature: 'invalid-signature-base64',
      };

      // #when: User verifies receipt
      const response = await request(app)
        .post('/receipts/verify')
        .send({ receipt })
        .expect(200);

      // #then: Signature is invalid
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Flow 6: Idempotency (Cached Responses)', () => {
    test.skip('should return cached response for duplicate request within TTL', async () => {
      // #given: Request processed successfully
      // (Requires mocking payment flow)

      // #when: Same request retried within 5 minutes with same idempotency key

      // #then: Should return cached response without reprocessing
      // expect(response.status).toBe(200);
      // expect(response.headers['x-stxact-receipt-id']).toBe(firstReceiptId);
    });
  });
});
