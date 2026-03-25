import type { Service } from '@/lib/api';

export function getServiceScore(service: Service): number {
  if (typeof service.reputation_score === 'number') {
    return service.reputation_score;
  }
  return service.reputation?.score || 0;
}

/**
 * Executes logic associated with get service total volume.
 */
export function getServiceTotalVolume(service: Service): string {
  if (service.total_volume) {
    return service.total_volume;
  }
  return service.reputation?.total_volume || '0';
}

/**
 * Executes logic associated with get service stake stx.
 */
export function getServiceStakeStx(service: Service): string {
  if (service.stake?.amount_stx) {
    return service.stake.amount_stx;
  }
  return '0';
}

/**
 * Executes logic associated with get service deliveries.
 */
export function getServiceDeliveries(service: Service): number {
  return typeof service.total_deliveries === 'number' ? service.total_deliveries : 0;
}

/**
 * Executes logic associated with get service disputes.
 */
export function getServiceDisputes(service: Service): number {
  return typeof service.total_disputes === 'number' ? service.total_disputes : 0;
}
