export type ReceiptKind = 'standard' | 'provisional' | 'final' | 'disputed' | 'resolved';

export const RECEIPT_KIND_LABELS: Record<ReceiptKind, string> = {
  standard: 'Standard Receipt',
  provisional: 'Provisional Receipt',
  final: 'Final Receipt',
  disputed: 'Disputed',
  resolved: 'Resolved',
};

export function isFinalReceiptKind(kind: ReceiptKind): boolean {
  return kind === 'final' || kind === 'resolved';
}

export function isPendingReceiptKind(kind: ReceiptKind): boolean {
  return kind === 'provisional';
}

export function isDisputedReceiptKind(kind: ReceiptKind): boolean {
  return kind === 'disputed';
}
