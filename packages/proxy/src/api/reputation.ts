import { Router, Request, Response } from 'express';
import { getPool } from '../storage/db';
import { logger } from '../config/logger';
import { getOnChainReputation } from '../utils/reputation';

const router = Router();

/**
 * GET /reputation/:principal
 * Query on-chain reputation for a seller principal
 */
router.get('/:principal', async (req: Request, res: Response) => {
  try {
    const { principal } = req.params;

    // Validate Stacks principal format
    if (!/^S[TP][0-9A-Z]{38,40}$/.test(principal)) {
      res.status(400).json({
        error: 'invalid_principal',
        message: 'Invalid Stacks principal format',
      });
      return;
    }

    // Query on-chain reputation
    const reputationData = await getOnChainReputation(principal);

    if (!reputationData) {
      res.status(404).json({
        error: 'no_reputation',
        message: 'No reputation data found for this principal',
      });
      return;
    }

    // Query database for historical data
    let deliveryCount = 0;
    const pool = getPool();
    try {
      const dbResult = await pool.query(
        `SELECT COUNT(*) as delivery_count
         FROM reputation_events
         WHERE seller_principal = $1`,
        [principal]
      );
      deliveryCount = parseInt(dbResult.rows[0]?.delivery_count || '0', 10);
    } catch (dbError) {
      logger.warn('Reputation events table unavailable, using on-chain-only response', {
        principal,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
    }

    res.status(200).json({
      principal,
      score: reputationData.score,
      total_volume: reputationData.totalVolume,
      delivery_count: deliveryCount,
      last_updated: reputationData.lastUpdated,
      on_chain: true,
    });
  } catch (error) {
    logger.error('Failed to fetch reputation', {
      principal: req.params.principal,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    res.status(500).json({
      error: 'reputation_fetch_failed',
      message: 'Failed to fetch reputation data',
    });
  }
});

/**
 * POST /reputation/record-delivery
 * Manually trigger reputation update (admin/debug endpoint)
 */
router.post('/record-delivery', async (req: Request, res: Response) => {
  try {
    const { seller_principal, receipt_id, payment_amount } = req.body;

    if (!seller_principal || !receipt_id || !payment_amount) {
      res.status(400).json({
        error: 'missing_fields',
        message: 'Required: seller_principal, receipt_id, payment_amount',
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
      res.status(404).json({
        error: 'receipt_not_found',
        message: `Receipt ${receipt_id} not found`,
      });
      return;
    }

    // Import reputation update function
    const { updateReputationAsync } = await import('../middleware/generate-receipt');

    await updateReputationAsync(seller_principal, receipt_id, payment_amount);

    res.status(200).json({
      status: 'recorded',
      seller_principal,
      receipt_id,
      message: 'Reputation update submitted to blockchain',
    });
  } catch (error) {
    logger.error('Manual reputation update failed', {
      seller_principal: req.body.seller_principal,
      receipt_id: req.body.receipt_id,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    res.status(500).json({
      error: 'reputation_update_failed',
      message: 'Failed to record delivery',
    });
  }
});

export default router;


/**
 * Guaranteed output structure for external reputation API queries.
 */
export interface StrictReputationResponse { readonly principal: string; readonly score: number; }
