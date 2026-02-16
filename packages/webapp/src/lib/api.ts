const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Receipt {
  receipt_id: string;
  request_hash: string;
  payment_txid: string;
  seller_principal: string;
  seller_bns_name: string | null;
  buyer_principal: string | null;
  delivery_commitment: string | null;
  timestamp: number;
  block_height: number;
  block_hash: string;
  key_version: number;
  revision: number;
  service_policy_hash: string | null;
  metadata?: Record<string, unknown>;
  signature: string;
}

export interface Token {
  symbol: string;
  contract_address?: string;
  network?: string;
}

export interface Service {
  principal: string;
  bns_name: string | null;
  endpoint_url: string;
  policy_hash: string;
  policy_url: string | null;
  category: string;
  supported_tokens: Token[];
  reputation_score: number;
  total_volume: string;
  registered_at: number;
}

export interface Dispute {
  dispute_id: string;
  receipt_id: string;
  buyer_principal: string;
  seller_principal: string;
  reason: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'refunded';
  created_at: number;
  resolved_at: number | null;
  refund_amount: string | null;
  refund_txid: string | null;
}

export interface Reputation {
  principal: string;
  score: number;
  total_volume: string;
  delivery_count: number;
  last_updated: number;
  on_chain: boolean;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface VerificationChecks {
  signature_valid: boolean;
  payment_on_chain: boolean;
  block_hash_valid: boolean;
  seller_registered: boolean;
}

class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'unknown_error', message: 'Request failed' }));
    throw new APIError(
      error.message || 'Request failed',
      response.status,
      error.error
    );
  }

  return response.json();
}

interface GetReceiptsParams {
  seller_principal?: string;
  buyer_principal?: string;
  limit?: number;
  offset?: number;
  sort?: 'timestamp_desc' | 'timestamp_asc';
}

interface GetServicesParams {
  category?: string;
  token?: string;
  min_reputation?: number;
  limit?: number;
  offset?: number;
}

interface GetDisputesParams {
  seller_principal?: string;
  buyer_principal?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface CreateDisputeData {
  receipt_id: string;
  reason: string;
  evidence?: Record<string, unknown>;
}

interface UpdateDisputeData {
  status: string;
  resolution_notes?: string;
}

export const api = {
  // Receipts
  getReceipts: (params?: GetReceiptsParams) => {
    const query = new URLSearchParams();
    if (params?.seller_principal) query.set('seller_principal', params.seller_principal);
    if (params?.buyer_principal) query.set('buyer_principal', params.buyer_principal);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.sort) query.set('sort', params.sort);

    return fetchAPI<{ receipts: Receipt[]; pagination: Pagination }>(`/receipts?${query}`);
  },

  getReceipt: (id: string) => {
    return fetchAPI<Receipt>(`/receipts/${id}`);
  },

  verifyReceipt: (receipt: Receipt) => {
    return fetchAPI<{ valid: boolean; checks: VerificationChecks }>(`/receipts/verify`, {
      method: 'POST',
      body: JSON.stringify({ receipt }),
    });
  },

  // Services
  getServices: (params?: GetServicesParams) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.token) query.set('supported_token', params.token);
    if (params?.min_reputation) query.set('min_reputation', params.min_reputation.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return fetchAPI<{ services: Service[]; pagination: Pagination }>(`/directory/services?${query}`);
  },

  getService: (principal: string) => {
    return fetchAPI<Service>(`/directory/services/${principal}`);
  },

  // Disputes
  getDisputes: (params?: GetDisputesParams) => {
    const query = new URLSearchParams();
    if (params?.seller_principal) query.set('seller_principal', params.seller_principal);
    if (params?.buyer_principal) query.set('buyer_principal', params.buyer_principal);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return fetchAPI<{ disputes: Dispute[]; pagination: Pagination }>(`/disputes?${query}`);
  },

  getDispute: (id: string) => {
    return fetchAPI<Dispute>(`/disputes/${id}`);
  },

  createDispute: (data: CreateDisputeData) => {
    return fetchAPI<Dispute>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDispute: (id: string, data: UpdateDisputeData) => {
    return fetchAPI<Dispute>(`/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Reputation
  getReputation: (principal: string) => {
    return fetchAPI<Reputation>(`/reputation/${principal}`);
  },
};
