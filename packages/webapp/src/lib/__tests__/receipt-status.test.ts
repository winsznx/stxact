import { describe, it, expect } from 'vitest';
import {
  RECEIPT_KIND_LABELS,
  isFinalReceiptKind,
  isPendingReceiptKind,
  isDisputedReceiptKind,
} from '../receipt-status';

describe('receipt-status', () => {
  it('exports a label for every kind', () => {
    expect(RECEIPT_KIND_LABELS.standard).toBeDefined();
    expect(RECEIPT_KIND_LABELS.provisional).toBeDefined();
    expect(RECEIPT_KIND_LABELS.final).toBeDefined();
    expect(RECEIPT_KIND_LABELS.disputed).toBeDefined();
    expect(RECEIPT_KIND_LABELS.resolved).toBeDefined();
  });

  it('classifies final and resolved as final', () => {
    expect(isFinalReceiptKind('final')).toBe(true);
    expect(isFinalReceiptKind('resolved')).toBe(true);
    expect(isFinalReceiptKind('provisional')).toBe(false);
  });

  it('classifies provisional as pending', () => {
    expect(isPendingReceiptKind('provisional')).toBe(true);
    expect(isPendingReceiptKind('final')).toBe(false);
  });

  it('classifies disputed correctly', () => {
    expect(isDisputedReceiptKind('disputed')).toBe(true);
    expect(isDisputedReceiptKind('resolved')).toBe(false);
  });
});
