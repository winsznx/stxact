import { getNonce } from '@stacks/transactions';
import { StacksNetwork } from '@stacks/network';
import { logger } from '../config/logger';

/**
 * Nonce Manager - Thread-Safe Nonce Allocation
 *
 * CRITICAL: Prevents nonce race conditions under concurrent contract calls.
 *
 * Problem:
 * - Multiple concurrent reputation updates call getNonce() simultaneously
 * - All receive same nonce from blockchain
 * - All attempt broadcast → only one succeeds
 * - Others fail with "nonce already used"
 *
 * Solution:
 * - In-memory nonce queue per address
 * - Atomic increment on allocation
 * - Periodic resync with blockchain to handle external transactions
 * - Mutex-based locking to prevent races
 *
 * PRD Reference: Section 15 - Performance + Reliability (Concurrency)
 */

interface NonceState {
  address: string;
  nextNonce: bigint;
  lastSyncBlock: number;
  pending: Set<bigint>; // Track pending transactions
}

class NonceManager {
  private state: Map<string, NonceState> = new Map();
  private locks: Map<string, Promise<void>> = new Map();
  private syncIntervalMs: number = 30000; // Re-sync every 30 seconds
  private network: StacksNetwork | null = null;

  /**
   * Initialize nonce manager with network configuration
   */
  async initialize(network: StacksNetwork): Promise<void> {
    this.network = network;
    logger.info('Nonce manager initialized');
  }

  /**
   * Allocate next nonce for address (thread-safe)
   */
  async allocateNonce(address: string): Promise<bigint> {
    // Ensure only one allocation happens at a time per address
    await this.acquireLock(address);

    try {
      const state = await this.getOrCreateState(address);

      // Allocate next nonce
      const allocatedNonce = state.nextNonce;
      state.nextNonce = state.nextNonce + 1n;
      state.pending.add(allocatedNonce);

      logger.debug('Nonce allocated', {
        address,
        nonce: allocatedNonce.toString(),
        next_nonce: state.nextNonce.toString(),
        pending_count: state.pending.size,
      });

      return allocatedNonce;
    } finally {
      this.releaseLock(address);
    }
  }

  /**
   * Mark nonce as confirmed (remove from pending)
   */
  markConfirmed(address: string, nonce: bigint): void {
    const state = this.state.get(address);
    if (state) {
      state.pending.delete(nonce);
      logger.debug('Nonce confirmed', {
        address,
        nonce: nonce.toString(),
        pending_count: state.pending.size,
      });
    }
  }

  /**
   * Mark nonce as failed (allow retry with same nonce)
   */
  async markFailed(address: string, nonce: bigint): Promise<void> {
    await this.acquireLock(address);

    try {
      const state = this.state.get(address);
      if (state) {
        state.pending.delete(nonce);

        // If this was the next expected nonce, reset counter
        if (nonce === state.nextNonce - 1n) {
          state.nextNonce = nonce;
          logger.info('Nonce reset after failure', {
            address,
            failed_nonce: nonce.toString(),
            reset_to: state.nextNonce.toString(),
          });
        }
      }
    } finally {
      this.releaseLock(address);
    }
  }

  /**
   * Force resync with blockchain (useful after errors)
   */
  async forceResync(address: string): Promise<void> {
    if (!this.network) {
      throw new Error('Nonce manager not initialized');
    }

    await this.acquireLock(address);

    try {
      logger.info('Force resyncing nonce with blockchain', { address });

      const onChainNonce = await getNonce(address, this.network);

      const state = this.state.get(address);
      if (state) {
        const previousNextNonce = state.nextNonce;
        // Use max of on-chain nonce and our tracked nonce
        const newNonce = onChainNonce > state.nextNonce ? onChainNonce : state.nextNonce;

        logger.info('Nonce resynced', {
          address,
          on_chain: onChainNonce.toString(),
          tracked: state.nextNonce.toString(),
          new: newNonce.toString(),
        });

        state.nextNonce = newNonce;
        state.lastSyncBlock = Date.now();
        // Clear pending if chain nonce advanced past our previous local watermark.
        if (onChainNonce > previousNextNonce) {
          state.pending.clear();
        }
      }
    } finally {
      this.releaseLock(address);
    }
  }

  /**
   * Get or create state for address
   */
  private async getOrCreateState(address: string): Promise<NonceState> {
    let state = this.state.get(address);

    if (!state) {
      // First time seeing this address, fetch from blockchain
      if (!this.network) {
        throw new Error('Nonce manager not initialized');
      }

      const onChainNonce = await getNonce(address, this.network);

      state = {
        address,
        nextNonce: onChainNonce,
        lastSyncBlock: Date.now(),
        pending: new Set(),
      };

      this.state.set(address, state);

      logger.info('Nonce state initialized', {
        address,
        initial_nonce: onChainNonce.toString(),
      });
    } else {
      // Periodically resync with blockchain to catch external transactions
      const timeSinceSync = Date.now() - state.lastSyncBlock;
      if (timeSinceSync > this.syncIntervalMs) {
        const onChainNonce = await getNonce(address, this.network!);

        // If on-chain nonce is higher, someone else submitted transactions
        if (onChainNonce > state.nextNonce) {
          logger.warn('Nonce drift detected - external transactions submitted', {
            address,
            tracked: state.nextNonce.toString(),
            on_chain: onChainNonce.toString(),
            drift: (onChainNonce - state.nextNonce).toString(),
          });

          state.nextNonce = onChainNonce;
          state.pending.clear(); // Clear pending as they're likely confirmed
        }

        state.lastSyncBlock = Date.now();
      }
    }

    return state;
  }

  /**
   * Acquire lock for address (prevents concurrent nonce allocation)
   */
  private async acquireLock(address: string): Promise<void> {
    const existingLock = this.locks.get(address);
    if (existingLock) {
      // Wait for existing lock to release
      await existingLock;
    }

    // Create new lock
    let releaseLock: (() => void) | null = null;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(address, lockPromise);

    // Store release function for later
    (lockPromise as any)._release = releaseLock;
  }

  /**
   * Release lock for address
   */
  private releaseLock(address: string): void {
    const lock = this.locks.get(address);
    if (lock) {
      const release = (lock as any)._release;
      if (release) {
        release();
      }
      this.locks.delete(address);
    }
  }

  /**
   * Get current state (for debugging/monitoring)
   */
  getState(address: string): Readonly<NonceState> | null {
    const state = this.state.get(address);
    return state
      ? {
          address: state.address,
          nextNonce: state.nextNonce,
          lastSyncBlock: state.lastSyncBlock,
          pending: new Set(state.pending),
        }
      : null;
  }
}

// Singleton instance
export const nonceManager = new NonceManager();
