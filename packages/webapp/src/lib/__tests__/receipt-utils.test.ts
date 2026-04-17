import { describe, it, expect } from 'vitest';
import { isReceiptAnchored, isReceiptRecent } from '../receipt-utils';
import type { Receipt } from '../api';

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    receipt_id: 'test-id', request_hash: 'abc', payment_txid: '0x123',
    seller_principal: 'ST1ABC', seller_bns_name: null, buyer_principal: null,
    delivery_commitment: null, timestamp: Math.floor(Date.now() / 1000),
    block_height: 100, block_hash: '0xblock', key_version: 1, revision: 1,
    service_policy_hash: null, signature: 'sig', ...overrides,
  };
}

describe('isReceiptAnchored', () => {
  it('returns true for anchored receipts', () => { expect(isReceiptAnchored(makeReceipt())).toBe(true); });
  it('returns false for unanchored', () => { expect(isReceiptAnchored(makeReceipt({ block_height: 0 }))).toBe(false); });
});

describe('isReceiptRecent', () => {
  it('returns true for recent receipts', () => { expect(isReceiptRecent(makeReceipt())).toBe(true); });
  it('returns false for old receipts', () => {
    expect(isReceiptRecent(makeReceipt({ timestamp: Math.floor(Date.now() / 1000) - 7200 }))).toBe(false);
  });
});
