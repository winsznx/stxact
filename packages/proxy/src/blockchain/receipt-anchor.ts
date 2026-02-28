import { createHash } from 'crypto';
import { logger } from '../config/logger';

/**
 * Receipt Anchoring Module
 *
 * Implements optional on-chain anchoring of receipts.
 *
 * PRD Reference: Section 8 - Optional Receipt Anchoring (lines 1101-1184)
 *
 * Features:
 * - Batches enqueue events for efficient processing
 * - Anchors each receipt using receipt-anchor.clar::anchor-receipt
 * - Flushes when threshold reached or timer expires
 * - Fire-and-forget pattern (errors logged, don't block receipt generation)
 */

interface AnchorRecord {
  receiptId: string;
  paymentTxid: string;
  sellerPrincipal: string;
}

interface AnchorBatch {
  records: AnchorRecord[];
  createdAt: number;
}

class ReceiptAnchorManager {
  private currentBatch: AnchorBatch = {
    records: [],
    createdAt: Date.now(),
  };
  private readonly batchThreshold = 100; // Anchor after 100 receipts
  private readonly batchTimeoutMs = 3600_000; // Anchor after 1 hour
  private timerHandle: NodeJS.Timeout | null = null;

  /**
   * Add a receipt to the current batch for anchoring
   * Triggers batch anchoring if threshold reached
   */
  async addReceipt(
    receiptId: string,
    paymentTxid: string,
    sellerPrincipal: string
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    this.currentBatch.records.push({
      receiptId,
      paymentTxid,
      sellerPrincipal,
    });

    // Start timer on first receipt in batch
    if (this.currentBatch.records.length === 1) {
      this.startBatchTimer();
    }

    // Anchor if threshold reached
    if (this.currentBatch.records.length >= this.batchThreshold) {
      await this.anchorCurrentBatch();
    }
  }

  /**
   * Check if receipt anchoring is enabled
   */
  private isEnabled(): boolean {
    return process.env.ENABLE_RECEIPT_ANCHORING === 'true' &&
           !!process.env.RECEIPT_ANCHOR_ADDRESS;
  }

  /**
   * Start timer to anchor batch after timeout
   */
  private startBatchTimer(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
    }

    this.timerHandle = setTimeout(() => {
      this.anchorCurrentBatch().catch((err) => {
        logger.error('Batch timer anchor failed', { error: err });
      });
    }, this.batchTimeoutMs);
  }

  /**
   * Anchor current batch on-chain
   * Fire-and-forget: errors logged but don't throw
   */
  private async anchorCurrentBatch(): Promise<void> {
    if (this.currentBatch.records.length === 0) {
      return;
    }

    const records = [...this.currentBatch.records];
    const batchSize = records.length;

    // Reset batch immediately (don't wait for transaction)
    this.currentBatch = {
      records: [],
      createdAt: Date.now(),
    };

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    try {
      logger.info('Anchoring receipt batch', {
        batch_size: batchSize,
        first_receipt: records[0]?.receiptId,
        last_receipt: records[batchSize - 1]?.receiptId,
      });

      // Import dependencies dynamically
      const {
        makeContractCall,
        broadcastTransaction,
        bufferCV,
        principalCV,
        AnchorMode,
      } = await import('@stacks/transactions');
      const { getStacksNetwork } = await import('../config/stacks');
      const { nonceManager } = await import('./nonce-manager');

      const network = getStacksNetwork();
      const anchorKey = process.env.SELLER_PRIVATE_KEY!;
      const [contractAddress, contractName] = process.env.RECEIPT_ANCHOR_ADDRESS!.split('.');
      const senderAddress = process.env.SERVICE_PRINCIPAL!;
      let successCount = 0;
      let failureCount = 0;

      // Initialize nonce manager if needed
      if (!(nonceManager as any)._initialized) {
        await nonceManager.initialize(network);
        (nonceManager as any)._initialized = true;
      }

      for (const record of records) {
        try {
          if (record.sellerPrincipal !== senderAddress) {
            logger.error('Skipping receipt anchor due to seller principal mismatch', {
              receipt_id: record.receiptId,
              expected_seller: senderAddress,
              actual_seller: record.sellerPrincipal,
            });
            failureCount++;
            continue;
          }

          const nonce = await nonceManager.allocateNonce(senderAddress);
          const txidWithoutPrefix = normalizeTxid(record.paymentTxid);
          const receiptHash = createHash('sha256').update(record.receiptId).digest();

          const anchorTx = await makeContractCall({
            contractAddress,
            contractName,
            functionName: 'anchor-receipt',
            functionArgs: [
              bufferCV(receiptHash),
              bufferCV(Buffer.from(record.receiptId, 'utf8')),
              principalCV(record.sellerPrincipal),
              bufferCV(Buffer.from(txidWithoutPrefix, 'utf8')),
            ],
            senderKey: anchorKey,
            network,
            anchorMode: AnchorMode.Any,
            nonce,
            fee: BigInt(process.env.CONTRACT_CALL_FEE || '1000'),
          });

          // Type annotation required: broadcastTransaction return type causes narrowing issues with TypeScript
          // @stacks/transactions doesn't export a proper type for the response, using any with explicit check below
          const broadcastResponse: any = await broadcastTransaction(anchorTx, network);

          if (broadcastResponse.error) {
            await nonceManager.markFailed(senderAddress, nonce);

            logger.error('Failed to broadcast receipt anchor transaction', {
              receipt_id: record.receiptId,
              payment_txid: record.paymentTxid,
              error: broadcastResponse.error,
              reason: broadcastResponse.reason,
            });
            failureCount++;
            continue;
          }

          // Mark nonce as confirmed (synchronous, non-blocking)
          try {
            nonceManager.markConfirmed(senderAddress, nonce);
          } catch (err) {
            logger.warn('Failed to mark nonce as confirmed (non-critical)', { error: err });
          }

          successCount++;
        } catch (recordError) {
          logger.error('Failed to prepare or anchor receipt record', {
            receipt_id: record.receiptId,
            payment_txid: record.paymentTxid,
            error: recordError instanceof Error ? recordError.message : 'Unknown error',
          });
          failureCount++;
        }
      }

      logger.info('Receipt batch anchored on-chain', {
        batch_size: batchSize,
        anchored_count: successCount,
        failed_count: failureCount,
      });
    } catch (error) {
      logger.error('Receipt batch anchoring failed', {
        batch_size: batchSize,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Force anchor current batch (for shutdown or manual trigger)
   */
  async flush(): Promise<void> {
    await this.anchorCurrentBatch();
  }
}

// Singleton instance
export const anchorManager = new ReceiptAnchorManager();

function normalizeTxid(txid: string): string {
  const normalized = txid.startsWith('0x') ? txid.slice(2) : txid;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`Invalid payment txid format for anchoring: ${txid}`);
  }
  return normalized.toLowerCase();
}
