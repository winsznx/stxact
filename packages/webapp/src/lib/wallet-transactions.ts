import { getNetwork, type StacksNetwork } from '@/lib/network';
import { getTransactionUrl } from '@/lib/stacks';

export function normalizeTxId(txId: string): string {
  return txId.startsWith('0x') ? txId : `0x${txId}`;
}

export function getCurrentNetwork(): StacksNetwork {
  return getNetwork();
}

export function getTransactionExplorerUrl(txId: string): string {
  return getTransactionUrl(normalizeTxId(txId));
}
