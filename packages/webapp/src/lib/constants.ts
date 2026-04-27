export const QUERY_STALE_TIMES = {
  services: 5 * 60 * 1000,
  receipts: 60 * 1000,
  disputes: 30 * 1000,
  reputation: 60 * 1000,
} as const;

export const DISPUTE_STATUSES = ['open', 'acknowledged', 'resolved', 'refunded', 'rejected'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const PAGINATION_DEFAULTS = { limit: 20, offset: 0 } as const;

export const STACKS_EXPLORER_BASE = 'https://explorer.hiro.so';

export const STACKS_ADDRESS_REGEX = /^S[PMTN][A-Z0-9]{38,39}$/;
export const STACKS_MAINNET_ADDRESS_REGEX = /^S[PM][A-Z0-9]{38,39}$/;
export const STACKS_TESTNET_ADDRESS_REGEX = /^S[TN][A-Z0-9]{38,39}$/;

export const SERVICE_CATEGORIES = [
  'data-api', 'ai-compute', 'storage', 'analytics', 'oracle', 'yield', 'other',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
