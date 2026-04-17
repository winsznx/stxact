import type { Receipt } from '@/lib/api';

export function isReceiptAnchored(receipt: Receipt): boolean {
  return receipt.block_height > 0 && !!receipt.block_hash;
}

export function getReceiptAge(receipt: Receipt): number {
  return Math.floor(Date.now() / 1000) - receipt.timestamp;
}

export function isReceiptRecent(receipt: Receipt, thresholdSeconds = 3600): boolean {
  return getReceiptAge(receipt) < thresholdSeconds;
}
