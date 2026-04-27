import { Request, Response, NextFunction } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';
import { verifyPaymentBinding } from '../crypto/payment-binding';
import { computeRequestHash, getTimestampBucket } from '../crypto/request-hash';
import { checkIdempotency } from '../storage/cache';
import { logger } from '../config/logger';
import { getStacksApiUrl } from '../config/network';

/**
 * x402 Payment Gate using Official x402-stacks Library
 *
 * Integrates official x402-stacks library for standard HTTP 402 protocol,
 * then applies stxact-specific replay protection and binding logic.
 *
 * Flow:
 * 1. x402-stacks paymentMiddleware handles 402 challenge + payment verification
 *    (with on-chain tx fallback when facilitator verification is unavailable)
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
      let paymentTxid = '';
      let resolvedAmount = amountMicroSTX;
      let payerPrincipal: string | null = null;
      let paymentNetwork = networkCAIP2;
      let paymentMetadata: ConfirmedTxMetadata | null = null;
      const browserPaymentTxid = extractBrowserPaymentTxid(req.get('payment-signature') || '');

      if (browserPaymentTxid) {
        const fallback = await tryOnChainPaymentFallback(req, {
          payTo: config.payTo,
          amountMicroSTX,
          networkCAIP2,
        });

        if (!fallback) {
          throw new Error('Browser payment retry did not include a confirmed txid payload');
        }

        paymentTxid = fallback.paymentTxid;
        resolvedAmount = fallback.amount;
        payerPrincipal = fallback.payer;
        paymentNetwork = fallback.network;
        paymentMetadata = fallback.metadata;

        logger.info('Payment verified via browser txid retry', {
          payment_txid: paymentTxid,
          payer: payerPrincipal,
        });
      } else {
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
          const payment = getPayment(req);

          if (!payment || !payment.transaction) {
            logger.error('Payment verification succeeded but no payment data attached');
            res.status(500).json({
              error: 'internal_error',
              message: 'Payment data not found after verification',
            });
            return;
          }

          paymentTxid = payment.transaction;
          const paymentExt = payment as Record<string, unknown>;
          const rawAmount = paymentExt.amount;
          resolvedAmount = rawAmount !== undefined ? String(rawAmount) : amountMicroSTX;
          payerPrincipal = payment.payer || (paymentExt.from as string) || (paymentExt.sender as string) || null;
          paymentNetwork = payment.network || networkCAIP2;
          paymentMetadata = await fetchConfirmedTxMetadata(paymentTxid);
        } catch (x402Error) {
          const fallback = await tryOnChainPaymentFallback(req, {
            payTo: config.payTo,
            amountMicroSTX,
            networkCAIP2,
          });

          if (!fallback) {
            throw x402Error;
          }

          paymentTxid = fallback.paymentTxid;
          resolvedAmount = fallback.amount;
          payerPrincipal = fallback.payer;
          paymentNetwork = fallback.network;
          paymentMetadata = fallback.metadata;

          logger.warn('x402 verification failed, recovered via on-chain fallback', {
            payment_txid: paymentTxid,
            payer: payerPrincipal,
            original_error: x402Error instanceof Error ? x402Error.message : 'Unknown error',
          });
        }
      }

      if (!paymentTxid || !paymentMetadata) {
        throw new Error('Payment verification completed without transaction metadata');
      }

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
      const reqWithExt = req as Request & {
        verifiedPayment?: unknown;
        requestHash?: string;
        idempotencyKey?: string;
      };
      reqWithExt.verifiedPayment = {
        payment_txid: paymentTxid,
        amount: resolvedAmount,
        payer: payerPrincipal,
        network: paymentNetwork,
        block_height: paymentMetadata.blockHeight,
        block_hash: paymentMetadata.blockHash,
      };
      reqWithExt.requestHash = requestHash;
      reqWithExt.idempotencyKey = idempotencyKey;

      logger.info('Payment verified and bound to request', {
        payment_txid: paymentTxid,
        request_hash: requestHash,
        payer: payerPrincipal,
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

interface ConfirmedTxMetadata {
  blockHeight: number;
  blockHash: string;
  senderAddress: string | null;
  recipientAddress: string | null;
  amountMicroSTX: string | null;
}

interface OnChainFallbackResult {
  paymentTxid: string;
  amount: string;
  payer: string | null;
  network: string;
  metadata: ConfirmedTxMetadata;
}

function decodePaymentSignature(paymentSignature: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(paymentSignature, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getPaymentSignatureString(
  parsed: Record<string, unknown> | null,
  field: string
): string | null {
  if (!parsed) {
    return null;
  }

  const directValue = parsed[field];
  if (typeof directValue === 'string' && directValue.trim()) {
    return directValue.trim();
  }

  const payload = parsed.payload;
  if (payload && typeof payload === 'object') {
    const nestedValue = (payload as Record<string, unknown>)[field];
    if (typeof nestedValue === 'string' && nestedValue.trim()) {
      return nestedValue.trim();
    }
  }

  return null;
}

function extractBrowserPaymentTxid(paymentSignature: string): string | null {
  const parsed = decodePaymentSignature(paymentSignature);
  return (
    getPaymentSignatureString(parsed, 'txid') ||
    getPaymentSignatureString(parsed, 'transactionHash')
  );
}

async function tryOnChainPaymentFallback(
  req: Request,
  context: { payTo: string; amountMicroSTX: string; networkCAIP2: string }
): Promise<OnChainFallbackResult | null> {
  const paymentSignature = req.get('payment-signature');
  if (!paymentSignature) {
    return null;
  }

  const paymentTxid = extractBrowserPaymentTxid(paymentSignature);
  if (!paymentTxid) {
    throw new Error('Fallback verification failed: payment-signature missing transaction payload');
  }

  const metadata = await fetchConfirmedTxMetadata(paymentTxid);

  if (!metadata.recipientAddress || !metadata.amountMicroSTX) {
    throw new Error(
      'Fallback verification failed: transaction does not expose recipient and amount metadata'
    );
  }

  if (metadata.recipientAddress.toUpperCase() !== context.payTo.toUpperCase()) {
    throw new Error('Fallback verification failed: payment recipient does not match configured payTo');
  }

  if (BigInt(metadata.amountMicroSTX) < BigInt(context.amountMicroSTX)) {
    throw new Error('Fallback verification failed: payment amount is below required minimum');
  }

  return {
    paymentTxid,
    amount: metadata.amountMicroSTX,
    payer: metadata.senderAddress,
    network: context.networkCAIP2,
    metadata,
  };
}

async function fetchConfirmedTxMetadata(paymentTxid: string): Promise<ConfirmedTxMetadata> {
  const txid = paymentTxid.startsWith('0x') ? paymentTxid : `0x${paymentTxid}`;
  const stacksApiUrl = getStacksApiUrl();
  const axios = await import('axios');

  const response = await axios.default.get(
    `${stacksApiUrl}/extended/v1/tx/${txid}`,
    { timeout: 10000 }
  );

  const txData = response.data || {};
  const blockHeight = Number(txData?.block_height || 0);
  const blockHash = String(txData?.block_hash || '');
  const txStatus = String(txData?.tx_status || '');
  const senderAddress = typeof txData?.sender_address === 'string' ? txData.sender_address : null;
  const txType = typeof txData?.tx_type === 'string' ? txData.tx_type : '';

  let recipientAddress: string | null = null;
  let amountMicroSTX: string | null = null;
  if (txType === 'token_transfer') {
    recipientAddress =
      typeof txData?.token_transfer?.recipient_address === 'string'
        ? txData.token_transfer.recipient_address
        : null;
    amountMicroSTX =
      txData?.token_transfer?.amount !== undefined && txData?.token_transfer?.amount !== null
        ? String(txData.token_transfer.amount)
        : null;
  }

  if (txStatus !== 'success' || !blockHeight || !blockHash) {
    throw new Error('Payment transaction is not confirmed with valid block metadata');
  }

  return { blockHeight, blockHash, senderAddress, recipientAddress, amountMicroSTX };
}
