import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { computeDeliverableHash } from '../crypto/deliverable-hash';
import { signReceipt } from '../crypto/signatures';
import { Receipt } from '../crypto/receipt-canonical';
import { getPool } from '../storage/db';
import { cacheResponse } from '../storage/cache';
import { logger } from '../config/logger';

/**
 * Receipt Generation Middleware
 *
 * Generates cryptographically signed receipt after successful upstream response.
 * Stores receipt in database and adds receipt headers to response.
 *
 * PRD Reference: Section 6 - Phase 5: Generate Receipt
 */

export async function generateReceiptMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const originalSend = res.send.bind(res);

  res.send = function (body: any): Response {
    (async () => {
      try {
        const verifiedPayment = (req as any).verifiedPayment;
        const requestHash = (req as any).requestHash;
        const idempotencyKey = (req as any).idempotencyKey;

        if (!verifiedPayment || !requestHash) {
          // No payment verification data, skip receipt generation
          return originalSend(body);
        }

        // Only generate receipts for successful responses (2xx)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return originalSend(body);
        }

        // Parse response body for deliverable hash
        let responseData: any;
        try {
          responseData = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          responseData = body;
        }

        // Compute deliverable hash
        const deliverableHash = computeDeliverableHash(responseData);

        // Generate receipt
        const receiptId = uuidv4();
        const timestamp = Math.floor(Date.now() / 1000);
        const sellerPrivateKey = process.env.SELLER_PRIVATE_KEY!;
        const servicePrincipal = process.env.SERVICE_PRINCIPAL!;
        const serviceBnsName = process.env.SERVICE_BNS_NAME || undefined;
        const servicePolicyHash = process.env.SERVICE_POLICY_HASH || undefined;

        const receipt: Omit<Receipt, 'signature'> = {
          receipt_id: receiptId,
          request_hash: requestHash,
          payment_txid: verifiedPayment.payment_txid,
          seller_principal: servicePrincipal,
          seller_bns_name: serviceBnsName,
          buyer_principal: undefined, // Optional: extract from payment if available
          delivery_commitment: deliverableHash,
          timestamp,
          block_height: verifiedPayment.block_height,
          block_hash: verifiedPayment.block_hash,
          key_version: 1,
          revision: 0,
          service_policy_hash: servicePolicyHash,
          metadata: {
            endpoint: `${req.method} ${req.path}`,
            price_sats: verifiedPayment.amount,
            token_contract: 'SP2ASJZHEKV2MBDYWS1HT63WXYXWX49NF.sbtc-token',
          },
        };

        // Sign receipt
        const signature = signReceipt(receipt, sellerPrivateKey);

        const signedReceipt: Receipt = {
          ...receipt,
          signature,
        };

        // Store receipt in database
        await storeReceipt(signedReceipt);

        // Update reputation on-chain (fire-and-forget)
        updateReputationAsync(servicePrincipal, receiptId, verifiedPayment.amount).catch(
          (error) => {
            logger.error('Failed to update reputation', {
              error: error.message,
              receipt_id: receiptId,
            });
          }
        );

        // Add receipt to anchoring batch (fire-and-forget, optional)
        if (process.env.ENABLE_RECEIPT_ANCHORING === 'true') {
          const { anchorManager } = await import('../blockchain/receipt-anchor');
          anchorManager.addReceipt(receiptId).catch((error) => {
            logger.error('Failed to add receipt to anchor batch', {
              error: error.message,
              receipt_id: receiptId,
            });
          });
        }

        // Add receipt headers to response
        const receiptJson = JSON.stringify(signedReceipt);
        res.set({
          'X-stxact-Receipt-ID': receiptId,
          'X-stxact-Deliverable-Hash': deliverableHash,
          'X-stxact-Signature': signature,
          'X-stxact-Receipt': Buffer.from(receiptJson).toString('base64'),
        });

        // Cache response for idempotency
        await cacheResponse(requestHash, idempotencyKey, {
          statusCode: res.statusCode,
          headers: {
            'X-stxact-Receipt-ID': receiptId,
            'X-stxact-Deliverable-Hash': deliverableHash,
            'X-stxact-Signature': signature,
            'X-stxact-Receipt': Buffer.from(receiptJson).toString('base64'),
          },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });

        logger.info('Receipt generated and signed', {
          receipt_id: receiptId,
          payment_txid: verifiedPayment.payment_txid,
          deliverable_hash: deliverableHash,
          seller_principal: servicePrincipal,
        });
      } catch (error) {
        logger.error('Failed to generate receipt', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      return originalSend(body);
    })();

    return res;
  };

  next();
}

/**
 * Store receipt in PostgreSQL database
 */
async function storeReceipt(receipt: Receipt): Promise<void> {
  const pool = getPool();

  const query = `
    INSERT INTO receipts (
      receipt_id, request_hash, payment_txid, seller_principal, seller_bns_name,
      buyer_principal, delivery_commitment, timestamp, block_height, block_hash,
      key_version, revision, service_policy_hash, metadata, signature
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  `;

  const values = [
    receipt.receipt_id,
    receipt.request_hash,
    receipt.payment_txid,
    receipt.seller_principal,
    receipt.seller_bns_name || null,
    receipt.buyer_principal || null,
    receipt.delivery_commitment || null,
    receipt.timestamp,
    receipt.block_height,
    receipt.block_hash,
    receipt.key_version,
    receipt.revision,
    receipt.service_policy_hash || null,
    receipt.metadata ? JSON.stringify(receipt.metadata) : null,
    receipt.signature,
  ];

  await pool.query(query, values);
}

/**
 * Update reputation on-chain (async, fire-and-forget)
 *
 * IMPLEMENTATION NOTES:
 * - This function calls reputation-map.clar record-successful-delivery
 * - Uses REPUTATION_UPDATER_PRIVATE_KEY (trusted proxy pattern per PRD Section 12, lines 2020-2054)
 * - Fire-and-forget pattern: errors are logged but don't block receipt generation
 * - Nonce management: uses getNonce to prevent conflicts
 * - Post-conditions: verifies contract call succeeded
 *
 * PRD Reference: Section 12 - Reputation Update Functions (lines 1917-1965)
 */
export async function updateReputationAsync(
  sellerPrincipal: string,
  receiptId: string,
  paymentAmountSats: string
): Promise<void> {
  try {
    const reputationMapAddress = process.env.REPUTATION_MAP_ADDRESS;
    const reputationUpdaterKey = process.env.REPUTATION_UPDATER_PRIVATE_KEY || process.env.SELLER_PRIVATE_KEY;

    if (!reputationMapAddress || !reputationUpdaterKey) {
      logger.warn('Reputation update skipped: REPUTATION_MAP_ADDRESS or REPUTATION_UPDATER_PRIVATE_KEY not configured');
      return;
    }

    const [address, contractName] = reputationMapAddress.split('.');

    // Dynamic imports to avoid loading heavy blockchain libs until needed
    const {
      makeContractCall,
      broadcastTransaction,
      AnchorMode,
      principalCV,
      bufferCVFromString,
      uintCV,
    } = await import('@stacks/transactions');
    const { getStacksNetwork } = await import('../config/stacks');
    const { createHash } = await import('crypto');

    const network = getStacksNetwork();

    // Compute receipt hash for on-chain recording
    // Note: We hash the receipt_id (UUID) not the full receipt JSON
    // This prevents double-counting while allowing off-chain receipt storage
    const receiptHash = createHash('sha256').update(receiptId).digest('hex');

    // Get next nonce from nonce manager (thread-safe, prevents race conditions)
    const { nonceManager } = await import('../blockchain/nonce-manager');
    const senderAddress = process.env.SERVICE_PRINCIPAL!;

    // Initialize nonce manager if first use
    if (!(nonceManager as any)._initialized) {
      await nonceManager.initialize(network);
      (nonceManager as any)._initialized = true;
    }

    const nonce = await nonceManager.allocateNonce(senderAddress);

    // Prepare contract call
    const txOptions = {
      contractAddress: address,
      contractName,
      functionName: 'record-successful-delivery',
      functionArgs: [
        principalCV(sellerPrincipal),
        bufferCVFromString(receiptHash),
        uintCV(parseInt(paymentAmountSats, 10)),
      ],
      senderKey: reputationUpdaterKey,
      network,
      anchorMode: AnchorMode.Any,
      nonce,
      fee: BigInt(process.env.CONTRACT_CALL_FEE || '1000'), // 0.001 STX default
    };

    logger.info('Submitting reputation update transaction', {
      seller_principal: sellerPrincipal,
      receipt_id: receiptId,
      payment_amount_sats: paymentAmountSats,
      receipt_hash: receiptHash,
      nonce: nonce.toString(),
    });

    // Make contract call
    const transaction = await makeContractCall(txOptions);

    // Broadcast transaction
    const broadcastResponse = await broadcastTransaction(transaction, network);

    if (broadcastResponse.error) {
      logger.error('Failed to broadcast reputation update', {
        error: broadcastResponse.error,
        reason: broadcastResponse.reason,
        receipt_id: receiptId,
        nonce: nonce.toString(),
      });

      // Mark nonce as failed - allows retry
      await nonceManager.markFailed(senderAddress, nonce);

      // If nonce conflict, force resync
      if (
        broadcastResponse.reason?.includes('nonce') ||
        broadcastResponse.error?.includes('nonce')
      ) {
        logger.warn('Nonce conflict detected, forcing resync', {
          address: senderAddress,
          failed_nonce: nonce.toString(),
        });
        await nonceManager.forceResync(senderAddress);
      }

      return;
    }

    logger.info('Reputation update transaction broadcast', {
      tx_id: broadcastResponse.txid,
      receipt_id: receiptId,
      seller_principal: sellerPrincipal,
      nonce: nonce.toString(),
    });

    // Mark nonce as confirmed (optimistic - actual confirmation happens later)
    // This prevents reuse while transaction is in mempool
    nonceManager.markConfirmed(senderAddress, nonce);
  } catch (error) {
    logger.error('Failed to update reputation on-chain', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      receipt_id: receiptId,
      seller_principal: sellerPrincipal,
    });
    // Don't throw - this is fire-and-forget
  }
}
