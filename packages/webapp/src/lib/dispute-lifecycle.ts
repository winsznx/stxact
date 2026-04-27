import type { DisputeStatus } from '@/lib/constants';

export const TERMINAL_STATUSES: readonly DisputeStatus[] = ['resolved', 'refunded', 'rejected'];
export const ACTIVE_STATUSES: readonly DisputeStatus[] = ['open', 'acknowledged'];

export function isTerminalStatus(s: DisputeStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

export function isActiveStatus(s: DisputeStatus): boolean {
  return ACTIVE_STATUSES.includes(s);
}

export function isRefundedStatus(s: DisputeStatus): boolean {
  return s === 'refunded';
}

export function canTransition(from: DisputeStatus, to: DisputeStatus): boolean {
  if (from === to) return false;
  if (isTerminalStatus(from)) return false;
  if (from === 'open' && (to === 'acknowledged' || to === 'rejected')) return true;
  if (from === 'acknowledged' && (to === 'resolved' || to === 'refunded' || to === 'rejected')) return true;
  return false;
}
