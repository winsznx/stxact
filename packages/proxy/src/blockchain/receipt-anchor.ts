import { createHash } from 'crypto';
import { logger } from '../config/logger';

/**
 * Receipt Anchoring Module
 *
 * Implements optional on-chain anchoring of receipt batches via Merkle root commitment.
 *
 * PRD Reference: Section 8 - Optional Receipt Anchoring (lines 1101-1184)
 *
 * Features:
 * - Batches receipts for efficient on-chain commitment
 * - Computes Merkle root over receipt IDs
 * - Anchors batches when threshold reached or timer expires
 * - Fire-and-forget pattern (errors logged, don't block receipt generation)
 */

interface AnchorBatch {
  receiptIds: string[];
  createdAt: number;
}

class ReceiptAnchorManager {
  private currentBatch: AnchorBatch = {
    receiptIds: [],
    createdAt: Date.now(),
  };
  private readonly batchThreshold = 100; // Anchor after 100 receipts
  private readonly batchTimeoutMs = 3600_000; // Anchor after 1 hour
  private timerHandle: NodeJS.Timeout | null = null;

  /**
   * Add a receipt to the current batch for anchoring
   * Triggers batch anchoring if threshold reached
   */
  async addReceipt(receiptId: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    this.currentBatch.receiptIds.push(receiptId);

    // Start timer on first receipt in batch
    if (this.currentBatch.receiptIds.length === 1) {
      this.startBatchTimer();
    }

    // Anchor if threshold reached
    if (this.currentBatch.receiptIds.length >= this.batchThreshold) {
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
   * Compute Merkle root over receipt IDs
   *
   * Algorithm:
   * 1. Sort receipt IDs (canonical ordering)
   * 2. Hash each receipt ID individually
   * 3. Build binary tree by hashing pairs
   * 4. Return root hash
   */
  private computeMerkleRoot(receiptIds: string[]): string {
    if (receiptIds.length === 0) {
      throw new Error('Cannot compute Merkle root of empty set');
    }

    // Sort for canonical ordering
    const sorted = [...receiptIds].sort();

    // Hash each receipt ID
    let hashes = sorted.map((id) =>
      createHash('sha256').update(id).digest()
    );

    // Build Merkle tree
    while (hashes.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          // Hash pair
          const combined = Buffer.concat([hashes[i], hashes[i + 1]]);
          nextLevel.push(createHash('sha256').update(combined).digest());
        } else {
          // Odd node, promote to next level
          nextLevel.push(hashes[i]);
        }
      }

      hashes = nextLevel;
    }

    return hashes[0].toString('hex');
  }

  /**
   * Anchor current batch on-chain
   * Fire-and-forget: errors logged but don't throw
   */
  private async anchorCurrentBatch(): Promise<void> {
    if (this.currentBatch.receiptIds.length === 0) {
      return;
    }

    const receiptIds = [...this.currentBatch.receiptIds];
    const batchSize = receiptIds.length;

    // Reset batch immediately (don't wait for transaction)
    this.currentBatch = {
      receiptIds: [],
      createdAt: Date.now(),
    };

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    try {
      logger.info('Anchoring receipt batch', {
        batch_size: batchSize,
        first_receipt: receiptIds[0],
        last_receipt: receiptIds[batchSize - 1],
      });

      const merkleRoot = this.computeMerkleRoot(receiptIds);

      // Import dependencies dynamically
      const {
        makeContractCall,
        broadcastTransaction,
        bufferCVFromString,
        uintCV,
        AnchorMode,
      } = await import('@stacks/transactions');
      const { getStacksNetwork } = await import('../config/stacks');
      const { nonceManager } = await import('./nonce-manager');

      const network = getStacksNetwork();
      const anchorKey = process.env.SELLER_PRIVATE_KEY!;
      const [contractAddress, contractName] = process.env.RECEIPT_ANCHOR_ADDRESS!.split('.');
      const senderAddress = process.env.SERVICE_PRINCIPAL!;

      // Initialize nonce manager if needed
      if (!(nonceManager as any)._initialized) {
        await nonceManager.initialize(network);
        (nonceManager as any)._initialized = true;
      }

      const nonce = await nonceManager.allocateNonce(senderAddress);

      const anchorTx = await makeContractCall({
        contractAddress,
        contractName,
        functionName: 'anchor-receipt-batch',
        functionArgs: [
          bufferCVFromString(merkleRoot),
          uintCV(batchSize),
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
          batch_size: batchSize,
          merkle_root: merkleRoot,
          error: broadcastResponse.error,
          reason: broadcastResponse.reason,
        });

        return;
      }

      // Mark nonce as confirmed (synchronous, non-blocking)
      try {
        nonceManager.markConfirmed(senderAddress, nonce);
      } catch (err) {
        logger.warn('Failed to mark nonce as confirmed (non-critical)', { error: err });
      }

      logger.info('Receipt batch anchored on-chain', {
        tx_id: broadcastResponse.txid,
        batch_size: batchSize,
        merkle_root: merkleRoot,
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
