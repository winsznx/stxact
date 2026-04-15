export const QUERY_STALE_TIMES = {
  services: 5 * 60 * 1000,
  receipts: 60 * 1000,
  disputes: 30 * 1000,
  reputation: 60 * 1000,
} as const;

export const DISPUTE_STATUSES = ['open', 'acknowledged', 'resolved', 'refunded', 'rejected'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const PAGINATION_DEFAULTS = {
  limit: 20,
  offset: 0,
} as const;

export const STACKS_EXPLORER_BASE = 'https://explorer.hiro.so';
