import { Router, Request, Response } from 'express';
import { verifyReceipt } from '../crypto/signatures';
import { Receipt } from '../crypto/receipt-canonical';
import { getPool } from '../storage/db';
import { getStacksNetwork } from '../config/stacks';
import { logger } from '../config/logger';
import { generateReceiptCSV } from '../utils/csv-formatter';

const router = Router();

/**
 * POST /receipts/verify
 * Verify a receipt's cryptographic signature and delivery proof
 *
 * PRD Reference: Section 7 - Endpoint: Verify Receipt (lines 669-722)
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { receipt } = req.body;

    if (!receipt) {
      res.status(400).json({
        error: 'missing_receipt',
        message: 'Receipt object is required',
      });
      return;
    }

    // Validate receipt structure
    const requiredFields = [
      'receipt_id',
      'request_hash',
      'payment_txid',
      'seller_principal',
      'timestamp',
      'block_height',
      'block_hash',
      'key_version',
      'revision',
      'signature',
    ];

    for (const field of requiredFields) {
      if (!(field in receipt)) {
        res.status(400).json({
          error: 'invalid_receipt',
          message: `Missing required field: ${field}`,
        });
        return;
      }
    }

    const network = getStacksNetwork();

    // Verify signature
    const signatureValid = await verifyReceipt(receipt as Receipt, network, true);

    // Verify payment transaction on-chain (optional, expensive)
    const verifyOnChain = req.query.on_chain === 'true';
    let paymentConfirmed = false;

    if (verifyOnChain) {
      paymentConfirmed = await verifyPaymentTransaction(receipt.payment_txid);
    }

    // Verify BNS name ownership (optional)
    const verifyBNS = req.query.bns === 'true';
    let bnsVerified = false;
    let bnsOwner: string | null = null;

    if (verifyBNS && receipt.seller_bns_name) {
      const { verifyBNSOwnership } = await import('../identity/bns');
      bnsVerified = await verifyBNSOwnership(receipt.seller_bns_name, receipt.seller_principal);
      bnsOwner = receipt.seller_principal;
    }

    const valid = signatureValid;

    res.status(200).json({
      valid,
      checks: {
        signature_valid: signatureValid,
        principal_match: signatureValid,
        payment_txid_confirmed: verifyOnChain ? paymentConfirmed : undefined,
        bns_verified: verifyBNS ? bnsVerified : undefined,
      },
      details: {
        seller_bns_resolved: bnsVerified,
        bns_owner: bnsOwner,
        payment_block_height: receipt.block_height,
      },
    });
  } catch (error) {
    logger.error('Receipt verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(422).json({
      error: 'verification_failed',
      message: error instanceof Error ? error.message : 'Receipt verification failed',
    });
  }
});

/**
 * GET /receipts
 * List receipts with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sellerPrincipal = req.query.seller_principal as string | undefined;
    const buyerPrincipal = req.query.buyer_principal as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const sort = (req.query.sort as string) || 'timestamp_desc';

    // Validate pagination
    if (limit > 100) {
      res.status(400).json({
        error: 'invalid_limit',
        message: 'Maximum limit is 100',
      });
      return;
    }

    const pool = getPool();

    // Build dynamic query
    let query = 'SELECT * FROM receipts WHERE 1=1';
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

    // Apply sorting
    const orderBy = sort === 'timestamp_desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY timestamp ${orderBy}`;

    // Add pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM receipts WHERE 1=1';
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

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      receipts: result.rows,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Failed to list receipts', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to list receipts',
    });
  }
});

/**
 * GET /receipts/:receipt_id
 * Retrieve a stored receipt by ID
 *
 * PRD Reference: Section 7 - Endpoint: Lookup Receipt (lines 723-738)
 */
router.get('/:receipt_id', async (req: Request, res: Response) => {
  try {
    const { receipt_id } = req.params;

    const pool = getPool();
    const result = await pool.query('SELECT * FROM receipts WHERE receipt_id = $1', [receipt_id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'receipt_not_found',
        message: `Receipt ${receipt_id} not found`,
      });
      return;
    }

    const row = result.rows[0];

    const metadataValue =
      row.metadata === null || row.metadata === undefined
        ? undefined
        : typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata;

    const receipt: Receipt = {
      receipt_id: row.receipt_id,
      request_hash: row.request_hash,
      payment_txid: row.payment_txid,
      seller_principal: row.seller_principal,
      seller_bns_name: row.seller_bns_name,
      buyer_principal: row.buyer_principal,
      delivery_commitment: row.delivery_commitment,
      timestamp: parseInt(row.timestamp, 10),
      block_height: parseInt(row.block_height, 10),
      block_hash: row.block_hash,
      key_version: parseInt(row.key_version, 10),
      revision: parseInt(row.revision, 10),
      service_policy_hash: row.service_policy_hash,
      metadata: metadataValue,
      signature: row.signature,
    };

    res.status(200).json(receipt);
  } catch (error) {
    logger.error('Failed to retrieve receipt', {
      error: error instanceof Error ? error.message : 'Unknown error',
      receipt_id: req.params.receipt_id,
    });

    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to retrieve receipt',
    });
  }
});

/**
 * GET /receipts/:receipt_id/pdf
 * Export receipt as PDF (stub for Phase 2 PDF generator)
 */
router.get('/:receipt_id/pdf', async (req: Request, res: Response) => {
  try {
    const { receipt_id } = req.params;

    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM receipts WHERE receipt_id = $1',
      [receipt_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'receipt_not_found',
        message: `Receipt ${receipt_id} not found`,
      });
      return;
    }

    // Import PDF generator (will be implemented in Phase 2)
    const { generateReceiptPDF } = await import('../utils/pdf-generator');

    const pdfBuffer = await generateReceiptPDF(result.rows[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Failed to generate receipt PDF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      receipt_id: req.params.receipt_id,
    });

    res.status(500).json({
      error: 'pdf_generation_failed',
      message: 'Failed to generate PDF',
    });
  }
});

/**
 * GET /receipts/:receipt_id/csv
 * Export receipt as CSV (stub for Phase 2 CSV formatter)
 */
router.get('/:receipt_id/csv', async (req: Request, res: Response) => {
  try {
    const { receipt_id } = req.params;

    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM receipts WHERE receipt_id = $1',
      [receipt_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'receipt_not_found',
        message: `Receipt ${receipt_id} not found`,
      });
      return;
    }

    const csvContent = generateReceiptCSV(result.rows[0]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt_id}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Failed to generate receipt CSV', {
      error: error instanceof Error ? error.message : 'Unknown error',
      receipt_id: req.params.receipt_id,
    });

    res.status(500).json({
      error: 'csv_generation_failed',
      message: 'Failed to generate CSV',
    });
  }
});

/**
 * Helper: Verify payment transaction exists on-chain
 */
async function verifyPaymentTransaction(paymentTxid: string): Promise<boolean> {
  try {
    const axios = await import('axios');
    const stacksApiUrl = process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';
    const txid = paymentTxid.startsWith('0x') ? paymentTxid : `0x${paymentTxid}`;

    const response = await axios.default.get(
      `${stacksApiUrl}/extended/v1/tx/${txid}`,
      {
        timeout: 10000,
      }
    );

    return response.data.tx_status === 'success';
  } catch (error) {
    logger.warn('Payment transaction verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      payment_txid: paymentTxid,
    });

    return false;
  }
}

export default router;
