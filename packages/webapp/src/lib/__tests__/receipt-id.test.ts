import { describe, it, expect } from 'vitest';
import { shortReceiptId, isValidReceiptId } from '../receipt-id';

describe('receipt-id', () => {
  it('returns id as-is if shorter than truncation', () => {
    expect(shortReceiptId('abc')).toBe('abc');
  });

  it('truncates with ellipsis between prefix and suffix', () => {
    const id = 'a'.repeat(40);
    const out = shortReceiptId(id);
    expect(out).toContain('…');
    expect(out.length).toBeLessThan(id.length);
  });

  it('honors custom prefix and suffix lengths', () => {
    const id = '1234567890abcdef';
    const out = shortReceiptId(id, 4, 2);
    expect(out).toBe('1234…ef');
  });

  it('isValidReceiptId accepts URL-safe ids', () => {
    expect(isValidReceiptId('a'.repeat(20))).toBe(true);
    expect(isValidReceiptId('AB-cd_ef-12-34')).toBe(true);
  });

  it('isValidReceiptId rejects too-short ids', () => {
    expect(isValidReceiptId('short')).toBe(false);
  });

  it('isValidReceiptId rejects invalid chars', () => {
    expect(isValidReceiptId('contains spaces in id 1234')).toBe(false);
  });
});
