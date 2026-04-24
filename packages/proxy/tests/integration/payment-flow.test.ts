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
  const buyerPrincipal = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  let paymentTxid: string;
  let requestHash: string;

  function createPaymentSignature(overrides: Record<string, unknown> = {}) {
    return Buffer.from(
      JSON.stringify({
        txid: paymentTxid,
        amount: '100000',
        payer: buyerPrincipal,
        ...overrides,
      })
    ).toString('base64');
  }

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

    test('should accept valid payment-signature and verify with facilitator', async () => {
      const response = await request(app)
        .get(testEndpoint)
        .set('payment-signature', createPaymentSignature())
        .expect(200);

      expect(response.body.payment_info.txid).toBe(paymentTxid);
      expect(response.body.payment_info.payer).toBe(buyerPrincipal);
      expect(response.headers['x-stxact-receipt']).toBeDefined();
    });

    test('should accept a browser wallet retry payload that only includes a confirmed txid', async () => {
      const browserRetrySignature = Buffer.from(
        JSON.stringify({
          x402Version: 2,
          accepted: {
            network: 'stacks:2147483648',
            asset: 'STX',
            amount: '100000',
            payTo: process.env.SERVICE_PRINCIPAL,
          },
          payload: {
            txid: paymentTxid,
          },
        })
      ).toString('base64');

      const response = await request(app)
        .get(testEndpoint)
        .set('payment-signature', browserRetrySignature)
        .expect(200);

      const receipt = JSON.parse(
        Buffer.from(response.headers['x-stxact-receipt'], 'base64').toString()
      );

      expect(response.body.payment_info.txid).toBe(paymentTxid);
      expect(response.body.payment_info.payer).toBe(buyerPrincipal);
      expect(receipt.payment_txid).toBe(paymentTxid);
      expect(receipt.buyer_principal).toBe(buyerPrincipal);
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
    test('should generate cryptographic receipt after successful payment', async () => {
      const response = await request(app)
        .get(testEndpoint)
        .set('payment-signature', createPaymentSignature())
        .expect(200);

      expect(response.headers['x-stxact-receipt-id']).toBeDefined();
      expect(response.headers['x-stxact-receipt']).toBeDefined();
      expect(response.headers['x-stxact-signature']).toBeDefined();

      const receipt = JSON.parse(
        Buffer.from(response.headers['x-stxact-receipt'], 'base64').toString()
      );

      expect(receipt.receipt_id).toBe(response.headers['x-stxact-receipt-id']);
      expect(receipt.payment_txid).toBe(paymentTxid);
      expect(receipt.buyer_principal).toBe(buyerPrincipal);
      expect(receipt.seller_principal).toBe(process.env.SERVICE_PRINCIPAL);
      expect(receipt.signature).toBe(response.headers['x-stxact-signature']);
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
    test('should verify a generated receipt from the x402 payment flow', async () => {
      const paidResponse = await request(app)
        .get(testEndpoint)
        .set('payment-signature', createPaymentSignature())
        .expect(200);

      const receipt = JSON.parse(
        Buffer.from(paidResponse.headers['x-stxact-receipt'], 'base64').toString()
      );

      const verifyResponse = await request(app)
        .post('/receipts/verify')
        .send({ receipt })
        .expect(200);

      expect(verifyResponse.body.valid).toBe(true);
      expect(verifyResponse.body.checks.signature_valid).toBe(true);
    });

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
    test('should recover when facilitator verification is unavailable by using on-chain fallback', async () => {
      const response = await request(app)
        .get(testEndpoint)
        .set(
          'payment-signature',
          createPaymentSignature({ simulateFacilitatorFailure: true })
        )
        .expect(200);

      const receipt = JSON.parse(
        Buffer.from(response.headers['x-stxact-receipt'], 'base64').toString()
      );

      expect(response.body.payment_info.txid).toBe(paymentTxid);
      expect(receipt.payment_txid).toBe(paymentTxid);
      expect(receipt.block_hash).toBe(`block-${paymentTxid}`);
    });
  });
});


/**
 * Structural constraints isolating active payment test instances.
 */
export interface PaymentFlowContext { readonly txid: string; readonly confirmed: boolean; }
