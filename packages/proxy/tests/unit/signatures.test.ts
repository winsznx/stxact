import {
  signReceipt,
  verifyReceipt,
  signRefundAuthorization,
  verifyRefundAuthorization,
} from '../../src/crypto/signatures';
import { Receipt } from '../../src/crypto/receipt-canonical';
import { StacksTestnet } from '@stacks/network';

describe('Signature Functions', () => {
  // Test private key (never use in production)
  const testPrivateKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const expectedPrincipal = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

  describe('Receipt Signatures', () => {
    const testReceipt: Omit<Receipt, 'metadata' | 'signature'> = {
      receipt_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      request_hash: 'a7f3d2c9e8b1f4a6d5c3e9b2f7a8d1c4e6b9f3a2d8c5e1b7f4a9d3c6e2b8f5a1',
      payment_txid: '0xabc123def456',
      seller_principal: expectedPrincipal,
      seller_bns_name: 'test-service.btc',
      buyer_principal: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
      delivery_commitment: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
      timestamp: 1735699200,
      block_height: 123456,
      block_hash: '0xabc123blockhash',
      key_version: 1,
      revision: 0,
      service_policy_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    test('sign and verify receipt round-trip', async () => {
      const signature = signReceipt(testReceipt, testPrivateKey);

      const fullReceipt: Receipt = {
        ...testReceipt,
        signature,
      };

      const network = new StacksTestnet();
      const isValid = await verifyReceipt(fullReceipt, network, false);

      expect(isValid).toBe(true);
    });

    test('signature verification fails with modified receipt', async () => {
      const signature = signReceipt(testReceipt, testPrivateKey);

      const modifiedReceipt: Receipt = {
        ...testReceipt,
        refund_amount: '99999', // Modified
        signature,
      };

      const network = new StacksTestnet();
      const isValid = await verifyReceipt(modifiedReceipt, network, false);

      expect(isValid).toBe(false);
    });
  });

  describe('Refund Authorization Signatures', () => {
    test('sign and verify refund authorization round-trip', () => {
      const refund = {
        dispute_id: 'test-dispute-uuid',
        receipt_id: 'test-receipt-uuid',
        refund_amount: '10000',
        buyer_principal: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        seller_principal: expectedPrincipal,
        timestamp: 1735699200,
      };

      const signature = signRefundAuthorization(refund, testPrivateKey);
      const refundWithSig = { ...refund, signature };

      const recoveredPrincipal = verifyRefundAuthorization(refundWithSig);

      expect(recoveredPrincipal).toBe(expectedPrincipal);
    });

    test('verification fails with wrong signature', () => {
      const refund = {
        dispute_id: 'test-dispute-uuid',
        receipt_id: 'test-receipt-uuid',
        refund_amount: '10000',
        buyer_principal: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        seller_principal: expectedPrincipal,
        timestamp: 1735699200,
        signature: 'invalid-signature-base64',
      };

      const recoveredPrincipal = verifyRefundAuthorization(refund);

      expect(recoveredPrincipal).toBeNull();
    });

    test('verification fails with modified dispute_id', () => {
      const refund = {
        dispute_id: 'original-dispute-id',
        receipt_id: 'test-receipt-uuid',
        refund_amount: '10000',
        buyer_principal: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        seller_principal: expectedPrincipal,
        timestamp: 1735699200,
      };

      const signature = signRefundAuthorization(refund, testPrivateKey);

      // Attempt to reuse signature for different dispute
      const modifiedRefund = {
        ...refund,
        dispute_id: 'different-dispute-id',
        signature,
      };

      const recoveredPrincipal = verifyRefundAuthorization(modifiedRefund);

      expect(recoveredPrincipal).toBeNull();
    });
  });
});
