import type { DisputeStatus } from '@/lib/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';

export function getDisputeStatusVariant(status: DisputeStatus): BadgeVariant {
  switch (status) {
    case 'open': return 'warning';
    case 'acknowledged': return 'accent';
    case 'resolved': return 'success';
    case 'refunded': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
}

export function getDisputeStatusLabel(status: DisputeStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
