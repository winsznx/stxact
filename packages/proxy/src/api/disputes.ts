import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getPool } from '../storage/db';
import { logger } from '../config/logger';
import { recoverPrincipalFromMessageSignature } from '../crypto/signatures';
import { canonicalize } from '../crypto/canonicalize';

const router = Router();

/**
 * POST /disputes
 * Create a dispute for a failed or incorrect delivery
 *
 * PRD Reference: Section 7 - Endpoint: Create Dispute (lines 831-868)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { receipt_id, reason, evidence, buyer_signature, timestamp } = req.body;

    if (!receipt_id || !reason) {
      res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: receipt_id, reason',
      });
      return;
    }

    if (!isUuid(receipt_id)) {
      res.status(400).json({
        error: 'invalid_receipt_id',
        message: 'receipt_id must be a UUID',
      });
      return;
    }

    const allowedReasons = new Set([
      'delivery_hash_mismatch',
      'no_response',
      'incomplete_delivery',
      'fraudulent_quote',
    ]);
    if (!allowedReasons.has(reason)) {
      res.status(400).json({
        error: 'invalid_reason',
        message: `reason must be one of: ${Array.from(allowedReasons).join(', ')}`,
      });
      return;
    }

    // Verify receipt exists
    const pool = getPool();
    const receiptResult = await pool.query(
      'SELECT * FROM receipts WHERE receipt_id = $1',
      [receipt_id]
    );

    if (receiptResult.rows.length === 0) {
      res.status(400).json({
        error: 'receipt_not_found',
        message: `Receipt ${receipt_id} not found`,
      });
      return;
    }

    const receipt = receiptResult.rows[0];
    const receiptBlockHeight = parseInt(String(receipt.block_height || '0'), 10);
    if (!Number.isFinite(receiptBlockHeight) || receiptBlockHeight <= 0) {
      res.status(422).json({
        error: 'invalid_receipt_block_height',
        message: 'Receipt is missing valid confirmation block metadata',
      });
      return;
    }
    const requireBuyerSignature = process.env.REQUIRE_BUYER_SIGNATURE === 'true';
    let buyerPrincipal = receipt.buyer_principal || null;
    const requestTimestamp = parseInt(String(timestamp || '0'), 10);

    if (buyer_signature) {
      if (!Number.isFinite(requestTimestamp) || requestTimestamp <= 0) {
        res.status(400).json({
          error: 'invalid_timestamp',
          message: 'timestamp is required when buyer_signature is provided',
        });
        return;
      }

      const requestSigMessage = [
        'STXACT-REQUEST',
        receipt.request_hash,
        buyerPrincipal || '',
        requestTimestamp.toString(),
      ].join(':');
      const disputeSigMessage = [
        'STXACT-DISPUTE',
        receipt_id,
        reason,
        requestTimestamp.toString(),
      ].join(':');

      let recoveredBuyerPrincipal = buyerPrincipal
        ? recoverPrincipalFromMessageSignature(requestSigMessage, buyer_signature, buyerPrincipal)
        : null;

      if (!recoveredBuyerPrincipal) {
        recoveredBuyerPrincipal = buyerPrincipal
          ? recoverPrincipalFromMessageSignature(disputeSigMessage, buyer_signature, buyerPrincipal)
          : recoverPrincipalFromMessageSignature(disputeSigMessage, buyer_signature);
      }

      if (!recoveredBuyerPrincipal) {
        res.status(401).json({
          error: 'invalid_buyer_signature',
          message: 'buyer_signature is invalid',
        });
        return;
      }

      if (buyerPrincipal && recoveredBuyerPrincipal !== buyerPrincipal) {
        res.status(401).json({
          error: 'buyer_principal_mismatch',
          message: 'buyer signature does not match receipt buyer principal',
        });
        return;
      }

      buyerPrincipal = recoveredBuyerPrincipal;
    } else if (requireBuyerSignature) {
      res.status(401).json({
        error: 'buyer_signature_required',
        message: 'buyer_signature is required when signed requests are enabled',
      });
      return;
    }

    if (!buyerPrincipal) {
      res.status(422).json({
        error: 'missing_buyer_principal',
        message: 'Receipt has no buyer principal; signed dispute request is required',
      });
      return;
    }

    if (!/^S[TP][0-9A-Z]{38,40}$/.test(buyerPrincipal)) {
      res.status(400).json({
        error: 'invalid_buyer_principal',
        message: 'Buyer principal is not a valid Stacks principal',
      });
      return;
    }

    if (!/^S[TP][0-9A-Z]{38,40}$/.test(receipt.seller_principal)) {
      res.status(422).json({
        error: 'invalid_seller_principal',
        message: 'Receipt seller principal is invalid',
      });
      return;
    }

    // Verify within dispute window (24 hours)
    const receiptTimestamp = parseInt(receipt.timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const disputeWindowSeconds = parseInt(process.env.DISPUTE_WINDOW_SECONDS || '86400', 10);

    if (currentTimestamp - receiptTimestamp > disputeWindowSeconds) {
      res.status(422).json({
        error: 'outside_dispute_window',
        message: 'Dispute must be filed within 24 hours of payment',
      });
      return;
    }

    // Check for existing dispute
    const existingDispute = await pool.query(
      'SELECT dispute_id FROM disputes WHERE receipt_id = $1',
      [receipt_id]
    );

    if (existingDispute.rows.length > 0) {
      res.status(409).json({
        error: 'dispute_exists',
        message: 'Dispute already exists for this receipt',
      });
      return;
    }

    // Create dispute
    const disputeId = uuidv4();
    const createdAt = Math.floor(Date.now() / 1000);
    const resolutionWindowSeconds = parseInt(process.env.RESOLUTION_WINDOW_SECONDS || '604800', 10); // 7 days default
    const resolutionDeadline = createdAt + resolutionWindowSeconds;

    // Create dispute on-chain first
    const {
      makeContractCall,
      broadcastTransaction,
      bufferCV,
      stringAsciiCV,
      principalCV,
      someCV,
      noneCV,
      uintCV,
      AnchorMode,
    } = await import('@stacks/transactions');
    const { getStacksNetwork } = await import('../config/stacks');
    const { nonceManager } = await import('../blockchain/nonce-manager');

    const network = getStacksNetwork();
    const sellerPrivateKey = process.env.SELLER_PRIVATE_KEY!;
    const [contractAddress, contractName] = process.env.DISPUTE_RESOLVER_ADDRESS!.split('.');
    const senderAddress = process.env.SERVICE_PRINCIPAL!;

    const evidenceHash = evidence
      ? createHash('sha256').update(JSON.stringify(canonicalize(evidence))).digest('hex')
      : null;

    if (!(nonceManager as any)._initialized) {
      await nonceManager.initialize(network);
      (nonceManager as any)._initialized = true;
    }

    const nonce = await nonceManager.allocateNonce(senderAddress);
    const disputeTx = await makeContractCall({
      contractAddress,
      contractName,
      functionName: 'create-dispute',
      functionArgs: [
        bufferCV(Buffer.from(disputeId, 'utf8')),
        bufferCV(Buffer.from(receipt_id, 'utf8')),
        principalCV(buyerPrincipal),
        principalCV(receipt.seller_principal),
        stringAsciiCV(reason),
        evidenceHash ? someCV(bufferCV(Buffer.from(evidenceHash, 'hex'))) : noneCV(),
        uintCV(receiptBlockHeight),
      ],
      senderKey: sellerPrivateKey,
      network,
      anchorMode: AnchorMode.Any,
      nonce,
      fee: BigInt(process.env.CONTRACT_CALL_FEE || '1000'),
    });

    // Type annotation required: broadcastTransaction return type causes narrowing issues with TypeScript
    // @stacks/transactions doesn't export a proper type for the response, using any with explicit check below
    const createDisputeResponse: any = await broadcastTransaction(disputeTx, network);

    if (createDisputeResponse.error) {
      await nonceManager.markFailed(senderAddress, nonce);

      logger.error('Failed to broadcast dispute creation transaction', {
        dispute_id: disputeId,
        receipt_id,
        error: createDisputeResponse.error,
        reason: createDisputeResponse.reason,
      });

      res.status(500).json({
        error: 'dispute_broadcast_failed',
        message: 'Failed to create dispute on-chain',
        details: createDisputeResponse.reason || createDisputeResponse.error,
      });
      return;
    }

    try {
      nonceManager.markConfirmed(senderAddress, nonce);
    } catch (err) {
      logger.warn('Failed to mark nonce as confirmed (non-critical)', { error: err });
    }

    const insertQuery = `
      INSERT INTO disputes (
        dispute_id, receipt_id, buyer_principal, seller_principal,
        reason, status, created_at, evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING dispute_id
    `;

    const values = [
      disputeId,
      receipt_id,
      buyerPrincipal,
      receipt.seller_principal,
      reason,
      'open',
      createdAt,
      evidence ? JSON.stringify(evidence) : null,
    ];

    await pool.query(insertQuery, values);

    logger.info('Dispute created', {
      dispute_id: disputeId,
      receipt_id,
      on_chain_txid: createDisputeResponse.txid,
      seller_principal: receipt.seller_principal,
      reason,
    });

    res.status(201).json({
      dispute_id: disputeId,
      status: 'open',
      created_at: createdAt,
      resolution_deadline: resolutionDeadline,
      tx_hash: createDisputeResponse.txid,
    });
  } catch (error) {
    logger.error('Failed to create dispute', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to create dispute',
    });
  }
});

/**
 * GET /disputes
 * List all disputes with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sellerPrincipal = req.query.seller_principal as string | undefined;
    const buyerPrincipal = req.query.buyer_principal as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const pool = getPool();

    // Build dynamic query
    let query = 'SELECT * FROM disputes WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (sellerPrincipal) {
      query += ` AND seller_principal = $${paramCount++}`;
      params.push(sellerPrincipal);
    }

    if (buyerPrincipal) {
      query += ` AND buyer_principal = $${paramCount++}`;
      params.push(buyerPrincipal);
    }

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    // Order by created_at DESC (most recent first)
    query += ' ORDER BY created_at DESC';

    // Add pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM disputes WHERE 1=1';
    const countParams: any[] = [];
    let countParamNum = 1;

    if (sellerPrincipal) {
      countQuery += ` AND seller_principal = $${countParamNum++}`;
      countParams.push(sellerPrincipal);
    }

    if (buyerPrincipal) {
      countQuery += ` AND buyer_principal = $${countParamNum++}`;
      countParams.push(buyerPrincipal);
    }

    if (status) {
      countQuery += ` AND status = $${countParamNum++}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      disputes: result.rows,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Failed to list disputes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to list disputes',
    });
  }
});

/**
 * GET /disputes/:dispute_id
 * Get dispute status and details
 *
 * PRD Reference: Section 7 - Endpoint: Get Dispute Status (lines 870-891)
 */
router.get('/:dispute_id', async (req: Request, res: Response) => {
  try {
    const { dispute_id } = req.params;

    const pool = getPool();
    const result = await pool.query('SELECT * FROM disputes WHERE dispute_id = $1', [dispute_id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'dispute_not_found',
        message: `Dispute ${dispute_id} not found`,
      });
      return;
    }

    const row = result.rows[0];

    res.status(200).json({
      dispute_id: row.dispute_id,
      receipt_id: row.receipt_id,
      buyer_principal: row.buyer_principal,
      seller_principal: row.seller_principal,
      status: row.status,
      reason: row.reason,
      evidence: row.evidence,
      refund_issued: row.refund_amount !== null,
      refund_amount: row.refund_amount ? row.refund_amount.toString() : null,
      refund_txid: row.refund_txid,
      created_at: parseInt(row.created_at, 10),
      resolved_at: row.resolved_at ? parseInt(row.resolved_at, 10) : null,
      resolution_notes: row.resolution_notes || null,
    });
  } catch (error) {
    logger.error('Failed to get dispute', {
      error: error instanceof Error ? error.message : 'Unknown error',
      dispute_id: req.params.dispute_id,
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get dispute',
    });
  }
});

/**
 * PATCH /disputes/:dispute_id
 * Update dispute status with state machine validation
 */
router.patch('/:dispute_id', async (req: Request, res: Response) => {
  try {
    const { dispute_id } = req.params;
    const { status, resolution_notes } = req.body;

    // Validate status value
    const validStatuses = ['open', 'acknowledged', 'resolved', 'refunded'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'invalid_status',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const pool = getPool();

    // Get current dispute
    const current = await pool.query(
      'SELECT * FROM disputes WHERE dispute_id = $1',
      [dispute_id]
    );

    if (current.rows.length === 0) {
      res.status(404).json({
        error: 'dispute_not_found',
        message: `Dispute ${dispute_id} not found`,
      });
      return;
    }

    const currentStatus = current.rows[0].status;

    // State machine: validate transitions
    const validTransitions: Record<string, string[]> = {
      'open': ['acknowledged', 'resolved', 'refunded'],
      'acknowledged': ['resolved', 'refunded'],
      'resolved': [], // Terminal state
      'refunded': []  // Terminal state
    };

    if (!validTransitions[currentStatus].includes(status)) {
      res.status(409).json({
        error: 'invalid_transition',
        message: `Cannot transition from ${currentStatus} to ${status}`,
      });
      return;
    }

    // Update dispute
    const updateQuery = `
      UPDATE disputes
      SET status = $1,
          resolution_notes = $2,
          resolved_at = $3,
          updated_at = NOW()
      WHERE dispute_id = $4
      RETURNING *
    `;

    const resolvedAt = ['resolved', 'refunded'].includes(status)
      ? Math.floor(Date.now() / 1000).toString()
      : current.rows[0].resolved_at;

    const result = await pool.query(updateQuery, [
      status,
      resolution_notes || current.rows[0].resolution_notes,
      resolvedAt,
      dispute_id
    ]);

    logger.info('Dispute status updated', {
      dispute_id,
      old_status: currentStatus,
      new_status: status,
    });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update dispute', {
      error: error instanceof Error ? error.message : 'Unknown error',
      dispute_id: req.params.dispute_id,
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to update dispute',
    });
  }
});

/**
 * POST /refunds
 * Submit refund authorization (seller)
 *
 * PRD Reference: Section 7 - Endpoint: Submit Refund Authorization (lines 893-920)
 *
 * IMPLEMENTATION NOTE:
 * 1. Seller submits signed refund authorization to this endpoint
 * 2. Proxy verifies signature off-chain (Clarity can't do ASCII string formatting)
 * 3. Proxy logs authorization for audit trail
 * 4. Returns authorization details to seller
 * 5. Seller must then call dispute-resolver.clar execute-refund directly via blockchain transaction
 *
 * This hybrid approach balances:
 * - Off-chain: Complex signature verification (TypeScript has full crypto capabilities)
 * - On-chain: Token transfer execution (Clarity native tx-sender verification)
 */
router.post('/refunds', async (req: Request, res: Response) => {
  try {
    const { dispute_id, receipt_id, refund_amount, buyer_principal, timestamp, seller_signature } =
      req.body;

    if (!dispute_id || !receipt_id || !refund_amount || !buyer_principal || !seller_signature || !timestamp) {
      res.status(400).json({
        error: 'missing_fields',
        message:
          'Required fields: dispute_id, receipt_id, refund_amount, buyer_principal, timestamp, seller_signature',
      });
      return;
    }

    const parsedRefundAmount = parseInt(String(refund_amount), 10);
    if (!Number.isFinite(parsedRefundAmount) || parsedRefundAmount <= 0) {
      res.status(400).json({
        error: 'invalid_refund_amount',
        message: 'refund_amount must be a positive integer in smallest unit',
      });
      return;
    }

    if (!/^S[TP][0-9A-Z]{38,40}$/.test(buyer_principal)) {
      res.status(400).json({
        error: 'invalid_buyer_principal',
        message: 'buyer_principal must be a valid Stacks principal',
      });
      return;
    }

    // Verify dispute exists and is open
    const pool = getPool();
    const disputeResult = await pool.query(
      'SELECT * FROM disputes WHERE dispute_id = $1',
      [dispute_id]
    );

    if (disputeResult.rows.length === 0) {
      res.status(404).json({
        error: 'dispute_not_found',
        message: `Dispute ${dispute_id} not found`,
      });
      return;
    }

    const dispute = disputeResult.rows[0];

    if (dispute.status !== 'open' && dispute.status !== 'acknowledged') {
      res.status(409).json({
        error: 'dispute_not_open',
        message: 'Dispute is not in open or acknowledged status',
      });
      return;
    }

    // Verify timestamp is recent (prevent replay of old authorizations)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampAge = currentTimestamp - parseInt(timestamp, 10);
    const maxAgeSeconds = parseInt(process.env.REFUND_AUTH_TIMEOUT_SECONDS || '86400', 10); // 24 hours default

    if (timestampAge > maxAgeSeconds) {
      res.status(422).json({
        error: 'timestamp_too_old',
        message: `Refund authorization timestamp is too old (age: ${timestampAge}s, max: ${maxAgeSeconds}s)`,
      });
      return;
    }

    // Import verification function
    const { verifyRefundAuthorization } = await import('../crypto/signatures');

    // Verify seller signature
    const refundAuth = {
      dispute_id,
      receipt_id,
      refund_amount: parsedRefundAmount.toString(),
      buyer_principal,
      seller_principal: dispute.seller_principal,
      timestamp: parseInt(timestamp, 10),
      signature: seller_signature,
    };

    const recoveredPrincipal = verifyRefundAuthorization(refundAuth);

    if (!recoveredPrincipal || recoveredPrincipal !== dispute.seller_principal) {
      res.status(401).json({
        error: 'invalid_signature',
        message: 'Refund authorization signature is invalid or does not match seller principal',
      });
      return;
    }

    // Store refund authorization in database for audit trail and compliance
    const insertAuthQuery = `
      INSERT INTO refund_authorizations (
        dispute_id, receipt_id, refund_amount, buyer_principal,
        seller_principal, timestamp, signature, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (dispute_id) DO UPDATE SET
        refund_amount = EXCLUDED.refund_amount,
        timestamp = EXCLUDED.timestamp,
        signature = EXCLUDED.signature,
        verified = EXCLUDED.verified
      RETURNING id
    `;

    const authValues = [
      dispute_id,
      receipt_id,
      parsedRefundAmount.toString(),
      buyer_principal,
      dispute.seller_principal,
      timestamp,
      seller_signature,
      true, // verified = true (we just verified it)
    ];

    const authResult = await pool.query(insertAuthQuery, authValues);

    logger.info('Refund authorization verified and persisted', {
      authorization_id: authResult.rows[0].id,
      dispute_id,
      receipt_id,
      refund_amount: parsedRefundAmount.toString(),
      buyer_principal,
      seller_principal: dispute.seller_principal,
      timestamp,
      signature_verified: true,
    });

    // Execute refund on-chain via dispute-resolver.clar
    const {
      makeContractCall,
      broadcastTransaction,
      bufferCV,
      uintCV,
      principalCV,
      AnchorMode,
    } = await import('@stacks/transactions');
    const { getStacksNetwork } = await import('../config/stacks');

    const network = getStacksNetwork();
    const sellerPrivateKey = process.env.SELLER_PRIVATE_KEY!;
    const [contractAddress, contractName] = process.env.DISPUTE_RESOLVER_ADDRESS!.split('.');

    // Import nonce manager for atomic nonce allocation
    const { nonceManager } = await import('../blockchain/nonce-manager');
    const senderAddress = process.env.SERVICE_PRINCIPAL!;
    if (dispute.seller_principal !== senderAddress) {
      res.status(422).json({
        error: 'seller_principal_mismatch',
        message: 'Configured seller key does not match dispute seller principal',
      });
      return;
    }

    if (!isUuid(dispute_id) || !isUuid(receipt_id)) {
      res.status(400).json({
        error: 'invalid_ids',
        message: 'dispute_id and receipt_id must be UUIDs',
      });
      return;
    }

    // Initialize nonce manager if first use
    if (!(nonceManager as any)._initialized) {
      await nonceManager.initialize(network);
      (nonceManager as any)._initialized = true;
    }

    const nonce = await nonceManager.allocateNonce(senderAddress);

    const refundTx = await makeContractCall({
      contractAddress,
      contractName,
      functionName: 'execute-refund',
      functionArgs: [
        bufferCV(Buffer.from(dispute_id, 'utf8')),
        uintCV(parsedRefundAmount),
        principalCV(buyer_principal),
      ],
      senderKey: sellerPrivateKey,
      network,
      anchorMode: AnchorMode.Any,
      nonce,
      fee: BigInt(process.env.CONTRACT_CALL_FEE || '1000'),
    });

    // Type annotation required: broadcastTransaction return type causes narrowing issues with TypeScript
    // @stacks/transactions doesn't export a proper type for the response, using any with explicit check below
    const broadcastResponse: any = await broadcastTransaction(refundTx, network);

    if (broadcastResponse.error) {
      // Mark nonce as failed for retry
      await nonceManager.markFailed(senderAddress, nonce);

      logger.error('Failed to broadcast refund transaction', {
        dispute_id,
        error: broadcastResponse.error,
        reason: broadcastResponse.reason,
      });

      res.status(500).json({
        error: 'refund_broadcast_failed',
        message: 'Refund authorization verified but blockchain transaction failed',
        details: broadcastResponse.reason || broadcastResponse.error,
      });
      return;
    }

    const refundTxid = broadcastResponse.txid;

    // Mark nonce as confirmed (synchronous, non-blocking)
    try {
      nonceManager.markConfirmed(senderAddress, nonce);
    } catch (err) {
      logger.warn('Failed to mark nonce as confirmed (non-critical)', { error: err });
    }

    // Update dispute record with refund txid
    await pool.query(
      `UPDATE disputes
       SET status = 'refunded',
           refund_amount = $1,
           refund_txid = $2,
           resolved_at = $3
       WHERE dispute_id = $4`,
      [parsedRefundAmount.toString(), refundTxid, Math.floor(Date.now() / 1000), dispute_id]
    );

    logger.info('Refund executed on-chain', {
      dispute_id,
      refund_txid: refundTxid,
      refund_amount: parsedRefundAmount.toString(),
      buyer_principal,
    });

    res.status(200).json({
      status: 'refunded',
      message: 'Refund authorization verified and executed on-chain',
      dispute_id,
      refund_txid: refundTxid,
      refund_amount: parsedRefundAmount.toString(),
      buyer_principal,
      seller_principal: dispute.seller_principal,
    });
  } catch (error) {
    logger.error('Failed to process refund authorization', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to process refund authorization',
    });
  }
});

export default router;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
