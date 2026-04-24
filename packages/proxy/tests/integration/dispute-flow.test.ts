import request from 'supertest';
import { app } from '../../src/index';
import { getPool } from '../../src/storage/db';

/**
 * Integration Test: Dispute Resolution Flow
 *
 * Tests the complete dispute lifecycle from creation through
 * refund authorization to on-chain execution.
 *
 * PRD Reference: Section 7 - Dispute Resolution Endpoints
 */

describe('Dispute Resolution Integration', () => {
  const testReceiptId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const testPaymentTxid = 'test-payment-dispute';
  const sellerPrincipal = process.env.SERVICE_PRINCIPAL!;
  const buyerPrincipal = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const disputeReason = 'no_response';
  let disputeId: string;

  beforeEach(async () => {
    // Clean up test data
    const pool = getPool();
    await pool.query('DELETE FROM disputes WHERE receipt_id LIKE $1', ['test-%']);
    await pool.query('DELETE FROM receipts WHERE receipt_id LIKE $1', ['test-%']);
    await pool.query('DELETE FROM refund_authorizations WHERE dispute_id LIKE $1', ['dispute-%']);

    // Create test receipt
    await pool.query(
      `INSERT INTO receipts (
        receipt_id, request_hash, payment_txid, seller_principal,
        buyer_principal, delivery_commitment, timestamp, block_height,
        block_hash, key_version, revision, signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testReceiptId,
        'test-hash',
        testPaymentTxid,
        sellerPrincipal,
        buyerPrincipal,
        'sha256-deliverable',
        Math.floor(Date.now() / 1000),
        12345,
        'block-hash',
        1,
        0,
        'test-signature',
      ]
    );
  });

  describe('Flow 1: Dispute Creation', () => {
    test('should create dispute for valid receipt', async () => {
      // #given: Receipt exists in database

      // #when: Buyer creates dispute
      const response = await request(app)
        .post('/disputes')
        .send({
          receipt_id: testReceiptId,
          reason: disputeReason,
        })
        .expect(201);

      // #then: Dispute created successfully
      expect(response.body.dispute_id).toBeDefined();
      expect(response.body.status).toBe('open');
      expect(response.body.resolution_deadline).toBeDefined();

      disputeId = response.body.dispute_id;

      // Verify dispute stored in database
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM disputes WHERE dispute_id = $1',
        [disputeId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].receipt_id).toBe(testReceiptId);
      expect(result.rows[0].seller_principal).toBe(sellerPrincipal);
      expect(result.rows[0].status).toBe('open');
    });

    test('should reject dispute for non-existent receipt', async () => {
      // #given: Receipt does not exist

      // #when: Buyer creates dispute for non-existent receipt
      const response = await request(app)
        .post('/disputes')
        .send({
          receipt_id: '9c9e6679-7425-40de-944b-e07fc1f90ae7',
          reason: disputeReason,
        })
        .expect(404);

      // #then: Should return not found error
      expect(response.body.error).toBe('receipt_not_found');
    });

    test('should enforce resolution deadline calculation', async () => {
      // #given: Current timestamp known
      const beforeCreate = Math.floor(Date.now() / 1000);

      // #when: Dispute created
      const response = await request(app)
        .post('/disputes')
        .send({
          receipt_id: testReceiptId,
          reason: disputeReason,
        })
        .expect(201);

      // #then: Deadline is 7 days from creation
      const deadline = parseInt(response.body.resolution_deadline, 10);
      const expectedDeadline = beforeCreate + 7 * 24 * 60 * 60; // 7 days

      expect(deadline).toBeGreaterThanOrEqual(expectedDeadline - 5);
      expect(deadline).toBeLessThanOrEqual(expectedDeadline + 5);
    });
  });

  describe('Flow 2: Dispute Status Query', () => {
    beforeEach(async () => {
      // Create test dispute
      const response = await request(app)
        .post('/disputes')
        .send({
          receipt_id: testReceiptId,
          reason: disputeReason,
        });

      disputeId = response.body.dispute_id;
    });

    test('should retrieve dispute status', async () => {
      // #when: Query dispute status
      const response = await request(app)
        .get(`/disputes/${disputeId}`)
        .expect(200);

      // #then: Returns complete dispute information
      expect(response.body.dispute_id).toBe(disputeId);
      expect(response.body.receipt_id).toBe(testReceiptId);
      expect(response.body.status).toBe('open');
      expect(response.body.refund_issued).toBe(false);
      expect(response.body.refund_amount).toBeNull();
      expect(response.body.refund_txid).toBeNull();
    });

    test('should return 404 for non-existent dispute', async () => {
      // #when: Query non-existent dispute
      const response = await request(app)
        .get('/disputes/non-existent-dispute-id')
        .expect(404);

      // #then: Returns not found error
      expect(response.body.error).toBe('dispute_not_found');
    });
  });

  describe('Flow 3: Refund Authorization Verification', () => {
    beforeEach(async () => {
      // Create test dispute
      const response = await request(app)
        .post('/disputes')
        .send({
          receipt_id: testReceiptId,
          reason: disputeReason,
        });

      disputeId = response.body.dispute_id;
    });

    test('should verify seller signature on refund authorization', async () => {
      // #given: Seller creates refund authorization
      const refundAmount = '100000'; // 0.1 STX in micro-STX
      const timestamp = Math.floor(Date.now() / 1000);

      // Sign refund authorization (requires seller private key)
      const { signRefundAuthorization } = await import('../../src/crypto/signatures');
      const refundAuth = {
        dispute_id: disputeId,
        receipt_id: testReceiptId,
        refund_amount: refundAmount,
        buyer_principal: buyerPrincipal,
        seller_principal: sellerPrincipal,
        timestamp,
      };

      const signature = signRefundAuthorization(
        refundAuth,
        process.env.SELLER_PRIVATE_KEY!
      );

      // #when: Seller submits refund authorization
      const response = await request(app)
        .post('/disputes/refunds')
        .send({
          dispute_id: disputeId,
          receipt_id: testReceiptId,
          refund_amount: refundAmount,
          buyer_principal: buyerPrincipal,
          timestamp,
          seller_signature: signature,
        })
        .expect(200);

      // #then: Authorization verified and refund executed on-chain
      expect(response.body.status).toBe('refunded');
      expect(response.body.refund_txid).toBeDefined();
      expect(response.body.refund_amount).toBe(refundAmount);
    });

    test('should reject refund with invalid signature', async () => {
      // #given: Invalid signature
      const timestamp = Math.floor(Date.now() / 1000);

      // #when: Submit refund with invalid signature
      const response = await request(app)
        .post('/disputes/refunds')
        .send({
          dispute_id: disputeId,
          receipt_id: testReceiptId,
          refund_amount: '100000',
          buyer_principal: buyerPrincipal,
          timestamp,
          seller_signature: 'invalid-signature',
        })
        .expect(401);

      // #then: Should reject with invalid signature error
      expect(response.body.error).toBe('invalid_signature');
    });

    test('should reject refund for closed dispute', async () => {
      // #given: Dispute is already resolved
      const pool = getPool();
      await pool.query(
        'UPDATE disputes SET status = $1 WHERE dispute_id = $2',
        ['resolved', disputeId]
      );

      const timestamp = Math.floor(Date.now() / 1000);

      // #when: Seller submits refund for closed dispute
      const response = await request(app)
        .post('/disputes/refunds')
        .send({
          dispute_id: disputeId,
          receipt_id: testReceiptId,
          refund_amount: '100000',
          buyer_principal: buyerPrincipal,
          timestamp,
          seller_signature: 'test-signature',
        })
        .expect(409);

      // #then: Should reject with dispute not open error
      expect(response.body.error).toBe('dispute_not_open');
    });

    test('should reject expired refund authorization', async () => {
      // #given: Timestamp too old
      const oldTimestamp = Math.floor(Date.now() / 1000) - 90000; // 25 hours ago

      // #when: Submit expired authorization
      const response = await request(app)
        .post('/disputes/refunds')
        .send({
          dispute_id: disputeId,
          receipt_id: testReceiptId,
          refund_amount: '100000',
          buyer_principal: buyerPrincipal,
          timestamp: oldTimestamp,
          seller_signature: 'test-signature',
        })
        .expect(422);

      // #then: Should reject with timestamp too old error
      expect(response.body.error).toBe('timestamp_too_old');
    });
  });

  describe('Flow 4: On-Chain Refund Execution', () => {
    test('should call dispute-resolver.clar execute-refund on blockchain', async () => {
      const response = await request(app)
        .post('/disputes')
        .send({
          receipt_id: testReceiptId,
          reason: disputeReason,
        })
        .expect(201);

      const { signRefundAuthorization } = await import('../../src/crypto/signatures');
      const { makeContractCall } = await import('@stacks/transactions');
      const signedAt = Math.floor(Date.now() / 1000);
      const currentDisputeId = response.body.dispute_id;
      const refundAmount = '100000';
      const signature = signRefundAuthorization(
        {
          dispute_id: currentDisputeId,
          receipt_id: testReceiptId,
          refund_amount: refundAmount,
          buyer_principal: buyerPrincipal,
          seller_principal: sellerPrincipal,
          timestamp: signedAt,
        },
        process.env.SELLER_PRIVATE_KEY!
      );

      await request(app)
        .post('/disputes/refunds')
        .send({
          dispute_id: currentDisputeId,
          receipt_id: testReceiptId,
          refund_amount: refundAmount,
          buyer_principal: buyerPrincipal,
          timestamp: signedAt,
          seller_signature: signature,
        })
        .expect(200);

      const mockedMakeContractCall = makeContractCall as unknown as {
        mock: { calls: Array<[Record<string, unknown>]> };
      };
      const lastCall = mockedMakeContractCall.mock.calls.at(-1)?.[0];

      expect(lastCall?.functionName).toBe('execute-refund');
    });

    test('should update dispute status after successful on-chain refund', async () => {
      const createResponse = await request(app)
        .post('/disputes')
        .send({
          receipt_id: testReceiptId,
          reason: disputeReason,
        })
        .expect(201);

      const currentDisputeId = createResponse.body.dispute_id;
      const { signRefundAuthorization } = await import('../../src/crypto/signatures');
      const timestamp = Math.floor(Date.now() / 1000);
      const refundAmount = '100000';
      const signature = signRefundAuthorization(
        {
          dispute_id: currentDisputeId,
          receipt_id: testReceiptId,
          refund_amount: refundAmount,
          buyer_principal: buyerPrincipal,
          seller_principal: sellerPrincipal,
          timestamp,
        },
        process.env.SELLER_PRIVATE_KEY!
      );

      await request(app)
        .post('/disputes/refunds')
        .send({
          dispute_id: currentDisputeId,
          receipt_id: testReceiptId,
          refund_amount: refundAmount,
          buyer_principal: buyerPrincipal,
          timestamp,
          seller_signature: signature,
        })
        .expect(200);

      const response = await request(app)
        .get(`/disputes/${currentDisputeId}`)
        .expect(200);

      expect(response.body.status).toBe('refunded');
      expect(response.body.refund_issued).toBe(true);
      expect(response.body.refund_txid).toBeDefined();
    });
  });
});


/**
 * Strict payload definition for e2e dispute reconciliation steps.
 */
export interface DisputeFlowContext { readonly disputeId: string; readonly resolved: boolean; }
