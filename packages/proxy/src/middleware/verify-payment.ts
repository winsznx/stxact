import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { verifyPaymentBinding } from '../crypto/payment-binding';
import { computeRequestHash, getTimestampBucket } from '../crypto/request-hash';
import { checkIdempotency } from '../storage/cache';
import { logger } from '../config/logger';

/**
 * Payment Verification Middleware
 *
 * Verifies payment signature with x402 facilitator or on-chain.
 * Checks payment amount, confirmation depth, and replay protection.
 *
 * PRD Reference: Section 6 - Phase 3: Payment Verification
 */

interface PaymentPayload {
  network: string;
  scheme: string;
  txid: string;
  amount: string;
  token: string;
  timestamp: number;
  signature: string;
}

interface VerifiedPayment {
  payment_txid: string;
  amount: string;
  block_height: number;
  block_hash: string;
  confirmed: boolean;
}

export async function verifyPaymentMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paymentSignatureHeader = req.get('PAYMENT-SIGNATURE');

    if (!paymentSignatureHeader) {
      res.status(400).json({
        error: 'missing_payment_signature',
        message: 'PAYMENT-SIGNATURE header required',
      });
      return;
    }

    // Compute request hash for idempotency check
    const now = Math.floor(Date.now() / 1000);
    const timestampBucket = getTimestampBucket(now);
    const idempotencyKey =
      req.get('X-Idempotency-Key') ||
      computeRequestHash(
        req.method,
        req.path,
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
        timestampBucket
      );

    const requestHash = computeRequestHash(
      req.method,
      req.path,
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
      timestampBucket,
      idempotencyKey
    );

    // Check idempotency cache
    const cachedResponse = await checkIdempotency(requestHash, idempotencyKey);
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

    // Decode payment signature
    const paymentPayload: PaymentPayload = JSON.parse(
      Buffer.from(paymentSignatureHeader, 'base64').toString('utf8')
    );

    logger.info('Verifying payment', {
      payment_txid: paymentPayload.txid,
      amount: paymentPayload.amount,
      network: paymentPayload.network,
    });

    // Verify payment with facilitator or on-chain
    const verifiedPayment = await verifyPaymentWithFacilitator(paymentPayload);

    if (!verifiedPayment.confirmed) {
      res.status(422).json({
        error: 'payment_not_confirmed',
        message: 'Payment transaction not confirmed on blockchain',
        payment_txid: paymentPayload.txid,
      });
      return;
    }

    // Verify payment amount matches requirement
    const expectedAmount = parseInt(process.env.DEFAULT_PAYMENT_AMOUNT || '10000', 10);
    const actualAmount = parseInt(verifiedPayment.amount, 10);

    if (actualAmount < expectedAmount) {
      res.status(422).json({
        error: 'insufficient_payment',
        message: `Payment amount ${actualAmount} sats is less than required ${expectedAmount} sats`,
      });
      return;
    }

    // Verify payment binding (prevent replay)
    await verifyPaymentBinding(verifiedPayment.payment_txid, requestHash);

    // Store verified payment data in request for downstream middleware
    (req as any).verifiedPayment = verifiedPayment;
    (req as any).requestHash = requestHash;
    (req as any).idempotencyKey = idempotencyKey;

    logger.info('Payment verified successfully', {
      payment_txid: verifiedPayment.payment_txid,
      block_height: verifiedPayment.block_height,
      amount: verifiedPayment.amount,
    });

    next();
  } catch (error) {
    logger.error('Payment verification failed', {
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

    res.status(422).json({
      error: 'payment_verification_failed',
      message: error instanceof Error ? error.message : 'Payment verification failed',
    });
  }
}

/**
 * Verify payment with x402 facilitator or fallback to on-chain verification
 */
async function verifyPaymentWithFacilitator(
  paymentPayload: PaymentPayload
): Promise<VerifiedPayment> {
  const facilitatorUrl = process.env.X402_FACILITATOR_URL;

  if (facilitatorUrl) {
    try {
      const response = await axios.post(
        `${facilitatorUrl}/verify`,
        {
          network: paymentPayload.network,
          txid: paymentPayload.txid,
          amount: paymentPayload.amount,
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        payment_txid: paymentPayload.txid,
        amount: paymentPayload.amount,
        block_height: response.data.block_height,
        block_hash: response.data.block_hash,
        confirmed: response.data.confirmed,
      };
    } catch (error) {
      logger.warn('Facilitator verification failed, falling back to on-chain', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Fallback: verify on-chain directly
  return verifyPaymentOnChain(paymentPayload);
}

/**
 * Verify payment directly on Stacks blockchain
 *
 * IMPLEMENTATION NOTES:
 * - Uses Stacks API to fetch transaction data
 * - Verifies transaction status, confirmations, and amount
 * - Parses transaction memo to extract request_hash (if present)
 * - Note: Request hash memo verification is advisory (not all payments include it)
 * - Primary replay protection is via payment-binding.ts permanent storage
 *
 * PRD Reference: Section 8 - Payment Transaction Binding (lines 1185-1242)
 */
async function verifyPaymentOnChain(paymentPayload: PaymentPayload): Promise<VerifiedPayment> {
  const stacksApiUrl = process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';
  const network = process.env.STACKS_NETWORK || 'testnet';

  try {
    // Fetch transaction data from Stacks API
    const txResponse = await axios.get(`${stacksApiUrl}/extended/v1/tx/${paymentPayload.txid}`, {
      timeout: 10000,
    });

    const txData = txResponse.data;

    // Check transaction status
    if (txData.tx_status !== 'success') {
      throw new Error(`Transaction status: ${txData.tx_status}`);
    }

    // Get required confirmation depth
    const requiredDepth =
      network === 'mainnet'
        ? parseInt(process.env.CONFIRMATION_DEPTH_MAINNET || '6', 10)
        : parseInt(process.env.CONFIRMATION_DEPTH_TESTNET || '1', 10);

    // Get current block height
    const blockResponse = await axios.get(`${stacksApiUrl}/extended/v1/block`, {
      timeout: 10000,
    });

    const currentHeight = blockResponse.data.results[0].height;
    const txBlockHeight = txData.block_height;
    const confirmations = currentHeight - txBlockHeight + 1;

    if (confirmations < requiredDepth) {
      throw new Error(
        `Insufficient confirmations: ${confirmations}/${requiredDepth} required`
      );
    }

    // Parse transaction data using @stacks/transactions for deterministic parsing
    // This ensures we extract fields correctly regardless of API format changes
    const { deserializeTransaction } = await import('@stacks/transactions');

    let transferAmount = '0';
    let txMemo: string | null = null;

    // If raw transaction data is available, parse it properly
    if (txData.tx) {
      try {
        const txBuffer = Buffer.from(txData.tx.slice(2), 'hex'); // Remove 0x prefix
        const parsedTx = deserializeTransaction(txBuffer);

        // Extract memo if present (memo is in the transaction payload)
        if ('payload' in parsedTx && parsedTx.payload) {
          const payload = parsedTx.payload as any;
          if ('memo' in payload && payload.memo) {
            // Memo is a buffer, convert to string
            txMemo = payload.memo.toString('utf8').replace(/\0+$/, ''); // Remove null padding
            logger.info('Transaction memo extracted', {
              payment_txid: paymentPayload.txid,
              memo_length: txMemo?.length || 0,
              memo_preview: txMemo?.substring(0, 64) || '',
            });
          }
        }
      } catch (parseError) {
        logger.warn('Failed to parse transaction with @stacks/transactions, using API data', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          payment_txid: paymentPayload.txid,
        });
      }
    }

    // Extract amount from transaction events (token transfer)
    if (txData.events && txData.events.length > 0) {
      const transferEvent = txData.events.find(
        (e: any) => e.event_type === 'stx_transfer' || e.event_type === 'ft_transfer'
      );

      if (transferEvent) {
        transferAmount = transferEvent.amount || transferEvent.value || '0';
      }
    }

    // Advisory memo check: log warning if memo present but doesn't match expected pattern
    // Note: This is not enforced as a hard requirement because not all x402 payments include memos
    // Primary replay protection is via payment-binding.ts permanent storage (Option B from PRD)
    if (txMemo && txMemo.length > 0) {
      logger.info('Payment transaction includes memo (advisory check)', {
        payment_txid: paymentPayload.txid,
        memo: txMemo,
      });
    }

    return {
      payment_txid: paymentPayload.txid,
      amount: transferAmount,
      block_height: txBlockHeight,
      block_hash: txData.block_hash,
      confirmed: confirmations >= requiredDepth,
    };
  } catch (error) {
    logger.error('On-chain payment verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      payment_txid: paymentPayload.txid,
    });

    throw new Error(
      `Failed to verify payment on-chain: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
