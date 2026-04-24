import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_STALE_TIMES } from '@/lib/constants';

export function useServices(params?: {
  category?: string;
  token?: string;
  min_reputation?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => api.getServices(params),
    staleTime: QUERY_STALE_TIMES.services,
  });
}

export function useService(principal: string) {
  return useQuery({
    queryKey: ['service', principal],
    queryFn: () => api.getService(principal),
    enabled: !!principal,
  });
}


/**
 * Configuration map orchestrating query caching and retry polling limits.
 */
export interface ServiceQueryConfig { readonly retryCount: number; readonly staleTimeMs: number; }
