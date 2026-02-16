import { getPool } from '../storage/db';
import { logger } from '../config/logger';

/**
 * Payment Transaction Binding
 *
 * Prevents the same payment_txid from being used for multiple different requests
 * within the same timestamp window.
 *
 * Uses permanent storage (used_payments table) for institutional-grade
 * replay protection (Option B from PRD Section 8, lines 1207-1224).
 *
 * Validation Rule:
 * 1. After payment verification, check if payment_txid exists in used_payments
 * 2. If exists AND request_hash differs → reject with error
 * 3. If not exists OR request_hash matches → proceed and store binding
 *
 * PRD Reference: Section 8 - Payment Transaction Binding
 */
export class PaymentBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentBindingError';
  }
}

export async function verifyPaymentBinding(
  paymentTxid: string,
  requestHash: string
): Promise<void> {
  const pool = getPool();

  try {
    const result = await pool.query(
      'SELECT request_hash FROM used_payments WHERE payment_txid = $1',
      [paymentTxid]
    );

    if (result.rows.length > 0) {
      const storedHash = result.rows[0].request_hash;

      if (storedHash !== requestHash) {
        logger.warn('Payment transaction already used for different request', {
          payment_txid: paymentTxid,
          stored_request_hash: storedHash,
          current_request_hash: requestHash,
        });

        throw new PaymentBindingError(
          'Payment transaction already used for different request'
        );
      }

      logger.debug('Payment transaction already bound to this request (idempotent retry)', {
        payment_txid: paymentTxid,
        request_hash: requestHash,
      });

      return;
    }

    await pool.query(
      'INSERT INTO used_payments (payment_txid, request_hash) VALUES ($1, $2)',
      [paymentTxid, requestHash]
    );

    logger.info('Payment transaction bound to request', {
      payment_txid: paymentTxid,
      request_hash: requestHash,
    });
  } catch (error) {
    if (error instanceof PaymentBindingError) {
      throw error;
    }

    logger.error('Failed to verify payment binding', {
      error: error instanceof Error ? error.message : 'Unknown error',
      payment_txid: paymentTxid,
      request_hash: requestHash,
    });

    throw new Error('Failed to verify payment binding');
  }
}

/**
 * Check if a payment transaction has been used
 * (Used for read-only checks without inserting)
 */
export async function isPaymentUsed(paymentTxid: string): Promise<boolean> {
  const pool = getPool();

  try {
    const result = await pool.query('SELECT 1 FROM used_payments WHERE payment_txid = $1', [
      paymentTxid,
    ]);

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Failed to check payment usage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      payment_txid: paymentTxid,
    });

    return false;
  }
}
