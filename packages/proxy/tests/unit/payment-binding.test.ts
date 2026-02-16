import { verifyPaymentBinding, PaymentBindingError } from '../../src/crypto/payment-binding';
import { getPool } from '../../src/storage/db';

describe('Payment Binding', () => {
  const testTxid = 'test-payment-txid-12345';
  const requestHash1 = 'hash-request-1';
  const requestHash2 = 'hash-request-2';

  beforeEach(async () => {
    const pool = getPool();
    await pool.query('DELETE FROM used_payments WHERE payment_txid = $1', [testTxid]);
  });

  test('allows first use of payment for request', async () => {
    await expect(verifyPaymentBinding(testTxid, requestHash1)).resolves.not.toThrow();
  });

  test('allows idempotent retry with same request', async () => {
    await verifyPaymentBinding(testTxid, requestHash1);
    await expect(verifyPaymentBinding(testTxid, requestHash1)).resolves.not.toThrow();
  });

  test('blocks replay with different request', async () => {
    await verifyPaymentBinding(testTxid, requestHash1);

    await expect(verifyPaymentBinding(testTxid, requestHash2)).rejects.toThrow(
      PaymentBindingError
    );
    await expect(verifyPaymentBinding(testTxid, requestHash2)).rejects.toThrow(
      'already used for different request'
    );
  });

  test('permanent storage - no expiration', async () => {
    await verifyPaymentBinding(testTxid, requestHash1);

    const pool = getPool();
    const result = await pool.query('SELECT created_at FROM used_payments WHERE payment_txid = $1', [
      testTxid,
    ]);

    expect(result.rows.length).toBe(1);

    // Verify created_at exists but no expiration column
    const row = result.rows[0];
    expect(row.created_at).toBeDefined();
    expect(row.expires_at).toBeUndefined();
  });
});
