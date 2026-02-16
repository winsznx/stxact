import { Request, Response, NextFunction } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';
import { verifyPaymentBinding } from '../crypto/payment-binding';
import { computeRequestHash, getTimestampBucket } from '../crypto/request-hash';
import { checkIdempotency } from '../storage/cache';
import { logger } from '../config/logger';

/**
 * x402 Payment Gate using Official x402-stacks Library
 *
 * Integrates official x402-stacks library for standard HTTP 402 protocol,
 * then applies stxact-specific replay protection and binding logic.
 *
 * Flow:
 * 1. x402-stacks paymentMiddleware handles 402 challenge + payment verification
 * 2. stxact payment binding prevents replay attacks
 * 3. stxact request hash computed for idempotency
 * 4. Downstream middleware generates receipt and updates reputation
 *
 * PRD Reference: Section 6 - Payment Protocol Integration
 * x402 Docs: https://docs.x402stacks.xyz/
 */

interface X402PaymentGateConfig {
  /** Payment amount in STX (will be converted to microSTX) */
  amountSTX?: number;
  /** Payment amount in microSTX (atomic units) */
  amountMicroSTX?: string;
  /** Recipient Stacks address */
  payTo: string;
  /** Network: "mainnet" or "testnet" */
  network: 'mainnet' | 'testnet';
  /** Facilitator URL (default: https://facilitator.stacksx402.com) */
  facilitatorUrl?: string;
  /** Resource description */
  description?: string;
}

/**
 * Creates x402 payment gate with stxact application layer
 */
export function createX402PaymentGate(config: X402PaymentGateConfig) {
  // Convert network to CAIP-2 format
  const networkCAIP2 = config.network === 'mainnet' ? 'stacks:1' : 'stacks:2147483648';

  // Determine amount in microSTX
  const amountMicroSTX = config.amountMicroSTX || STXtoMicroSTX(config.amountSTX || 0.1).toString();

  // Create x402-stacks payment middleware
  const x402Middleware = paymentMiddleware({
    network: networkCAIP2,
    amount: amountMicroSTX,
    asset: 'STX', // Using native STX token
    payTo: config.payTo,
    facilitatorUrl: config.facilitatorUrl || 'https://facilitator.stacksx402.com',
    description: config.description,
    scheme: 'exact',
    maxTimeoutSeconds: 300,
  });

  // Return combined middleware: x402 gate + stxact application layer
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Run x402 payment verification first
      await new Promise<void>((resolve, reject) => {
        x402Middleware(req, res, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // If we reach here, x402 payment verification succeeded
      // Now apply stxact application layer logic

      // Get payment info from x402-stacks
      const payment = getPayment(req);

      if (!payment || !payment.transaction) {
        logger.error('Payment verification succeeded but no payment data attached');
        res.status(500).json({
          error: 'internal_error',
          message: 'Payment data not found after verification',
        });
        return;
      }

      const paymentTxid = payment.transaction;

      // Compute stxact request hash for replay protection
      const now = Math.floor(Date.now() / 1000);
      const timestampBucket = getTimestampBucket(now);
      const idempotencyKey = req.get('X-Idempotency-Key');

      const requestHash = computeRequestHash(
        req.method,
        req.path,
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
        timestampBucket,
        idempotencyKey
      );

      // Check idempotency cache (only if idempotency key provided)
      const cachedResponse = idempotencyKey
        ? await checkIdempotency(requestHash, idempotencyKey)
        : null;
      if (cachedResponse) {
        logger.info('Idempotency cache hit - returning cached response', {
          request_hash: requestHash,
          idempotency_key: idempotencyKey,
        });

        res.status(cachedResponse.statusCode);
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          res.set(key, value);
        });
        res.send(cachedResponse.body);
        return;
      }

      // Verify payment binding (stxact replay protection)
      // This ensures payment txid is bound to this specific request
      await verifyPaymentBinding(paymentTxid, requestHash);

      // Store verified payment data for downstream middleware
      (req as any).verifiedPayment = {
        payment_txid: paymentTxid,
        amount: amountMicroSTX,
        payer: payment.payer,
        network: payment.network,
      };
      (req as any).requestHash = requestHash;
      (req as any).idempotencyKey = idempotencyKey;

      logger.info('Payment verified and bound to request', {
        payment_txid: paymentTxid,
        request_hash: requestHash,
        payer: payment.payer,
      });

      // Proceed to next middleware (receipt generation, etc.)
      next();
    } catch (error) {
      logger.error('Payment gate error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof Error && error.message.includes('already used')) {
        res.status(409).json({
          error: 'payment_already_used',
          message: error.message,
        });
        return;
      }

      // Don't send error response if headers already sent (x402 middleware handled it)
      if (!res.headersSent) {
        res.status(422).json({
          error: 'payment_verification_failed',
          message: error instanceof Error ? error.message : 'Payment verification failed',
        });
      }
    }
  };
}
