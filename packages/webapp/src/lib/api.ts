const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

/**
 * Core definition structure for Receipt.
 */
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

/**
 * Core definition structure for Token.
 */
export interface Token {
  symbol: string;
  token_contract?: string;
  network?: string;
}

/**
 * Core definition structure for Service.
 */
export interface Service {
  service_id?: string;
  principal: string;
  bns_name: string | null;
  endpoint_url: string;
  policy_hash: string;
  policy_url: string | null;
  category: string;
  tags?: string[];
  supported_tokens: Token[];
  pricing?: Record<string, unknown> | null;
  reputation_score?: number;
  total_volume?: string;
  total_deliveries?: number;
  total_disputes?: number;
  registered_at: string | number;
  reputation?: {
    score: number;
    success_rate: number;
    total_volume: string;
  };
  stake?: {
    amount_stx: string;
    bonded: boolean;
  };
}

/**
 * Core definition structure for Dispute.
 */
export interface Dispute {
  dispute_id: string;
  receipt_id: string;
  buyer_principal?: string;
  seller_principal?: string;
  reason: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'refunded' | 'rejected';
  evidence?: Record<string, unknown> | null;
  created_at: number;
  resolved_at: number | null;
  resolution_notes?: string | null;
  refund_issued?: boolean;
  refund_amount: string | null;
  refund_txid: string | null;
  resolution_deadline?: number;
  tx_hash?: string;
}

/**
 * Core definition structure for Reputation.
 */
export interface Reputation {
  principal: string;
  score: number;
  total_volume: string;
  delivery_count: number;
  last_updated: number;
  on_chain: boolean;
}

/**
 * Core definition structure for Pagination.
 */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more?: boolean;
}

/**
 * Core definition structure for VerificationChecks.
 */
export interface VerificationChecks {
  signature_valid: boolean;
  principal_match?: boolean;
  payment_txid_confirmed?: boolean;
  bns_verified?: boolean;
}

/**
 * Core definition structure for RegisterServicePayload.
 */
export interface RegisterServicePayload {
  endpoint_url: string;
  policy_hash: string;
  bns_name?: string;
  category: string;
  supported_tokens: Token[];
  tags?: string[];
  pricing?: Record<string, unknown>;
  policy_url?: string;
  signature: string;
  timestamp: number;
}

/**
 * Core definition structure for RefundAuthorizationPayload.
 */
export interface RefundAuthorizationPayload {
  dispute_id: string;
  receipt_id: string;
  refund_amount: string;
  buyer_principal: string;
  timestamp: number;
  seller_signature: string;
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
  const headers = new Headers(options?.headers);

  if (!(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'unknown_error', message: 'Request failed' }));
    throw new APIError(error.message || 'Request failed', response.status, error.error);
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
  buyer_signature?: string;
  timestamp?: number;
}

interface UpdateDisputeData {
  status: string;
  resolution_notes?: string;
}

/**
 * Exported constant for api.
 */
export const api = {
  getReceipts: (params?: GetReceiptsParams) => {
    const query = new URLSearchParams();
    if (params?.seller_principal) query.set('seller_principal', params.seller_principal);
    if (params?.buyer_principal) query.set('buyer_principal', params.buyer_principal);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.sort) query.set('sort', params.sort);
    return fetchAPI<{ receipts: Receipt[]; pagination: Pagination }>(`/receipts?${query}`);
  },

  getReceipt: (id: string) => fetchAPI<Receipt>(`/receipts/${id}`),

  verifyReceipt: (
    receipt: Receipt,
    options?: {
      on_chain?: boolean;
      bns?: boolean;
    }
  ) => {
    const query = new URLSearchParams();
    if (options?.on_chain) query.set('on_chain', 'true');
    if (options?.bns) query.set('bns', 'true');
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return fetchAPI<{ valid: boolean; checks: VerificationChecks }>(`/receipts/verify${suffix}`, {
      method: 'POST',
      body: JSON.stringify({ receipt }),
    });
  },

  getServices: (params?: GetServicesParams) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.token) query.set('supported_token', params.token);
    if (params?.min_reputation) query.set('min_reputation', params.min_reputation.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return fetchAPI<{ services: Service[]; pagination: Pagination }>(`/directory/services?${query}`);
  },

  getService: (principal: string) => fetchAPI<Service>(`/directory/services/${principal}`),

  registerService: (payload: RegisterServicePayload) =>
    fetchAPI<{ service_id: string; status: string; tx_hash: string }>(`/directory/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDisputes: (params?: GetDisputesParams) => {
    const query = new URLSearchParams();
    if (params?.seller_principal) query.set('seller_principal', params.seller_principal);
    if (params?.buyer_principal) query.set('buyer_principal', params.buyer_principal);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return fetchAPI<{ disputes: Dispute[]; pagination: Pagination }>(`/disputes?${query}`);
  },

  getDispute: (id: string) => fetchAPI<Dispute>(`/disputes/${id}`),

  createDispute: (data: CreateDisputeData) =>
    fetchAPI<Dispute>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDispute: (id: string, data: UpdateDisputeData) =>
    fetchAPI<Dispute>(`/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  submitRefundAuthorization: (payload: RefundAuthorizationPayload) =>
    fetchAPI<{
      status: string;
      dispute_id: string;
      refund_txid: string;
      refund_amount: string;
      buyer_principal: string;
      seller_principal: string;
    }>(`/disputes/refunds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReputation: (principal: string) => fetchAPI<Reputation>(`/reputation/${principal}`),
};

export { APIError };
