import { nonceManager } from '../../src/blockchain/nonce-manager';
import { StacksTestnet } from '@stacks/network';

describe('NonceManager', () => {
  const testAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const network = new StacksTestnet();

  beforeEach(async () => {
    await nonceManager.initialize(network);
  });

  test('allocates unique nonces under concurrent load', async () => {
    const concurrentRequests = 100;
    const promises = Array.from({ length: concurrentRequests }, () =>
      nonceManager.allocateNonce(testAddress)
    );

    const nonces = await Promise.all(promises);

    // All nonces must be unique
    const nonceStrings = nonces.map((n) => n.toString());
    const uniqueNonces = new Set(nonceStrings);
    expect(uniqueNonces.size).toBe(concurrentRequests);

    // Nonces must be sequential
    const sortedNonces = nonces.map((n) => Number(n)).sort((a, b) => a - b);
    for (let i = 1; i < sortedNonces.length; i++) {
      expect(sortedNonces[i]).toBe(sortedNonces[i - 1] + 1);
    }
  });

  test('recovers from failed nonce', async () => {
    const nonce1 = await nonceManager.allocateNonce(testAddress);

    // Simulate failure
    await nonceManager.markFailed(testAddress, nonce1);

    // Next allocation should reuse the failed nonce
    const nonce2 = await nonceManager.allocateNonce(testAddress);
    expect(nonce2).toBe(nonce1);
  });

  test('marks confirmed nonces as used', async () => {
    const nonce1 = await nonceManager.allocateNonce(testAddress);
    nonceManager.markConfirmed(testAddress, nonce1);

    const state = nonceManager.getState(testAddress);
    expect(state?.pending.has(nonce1)).toBe(false);
  });

  test('handles resync without losing pending nonces', async () => {
    const nonce1 = await nonceManager.allocateNonce(testAddress);
    const nonce2 = await nonceManager.allocateNonce(testAddress);

    // Force resync (simulates external transaction)
    await nonceManager.forceResync(testAddress);

    // Should still be able to allocate sequential nonces
    const nonce3 = await nonceManager.allocateNonce(testAddress);
    expect(Number(nonce3)).toBeGreaterThan(Number(nonce2));
  });
});
