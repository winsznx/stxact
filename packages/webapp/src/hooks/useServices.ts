import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Executes logic associated with use services.
 */
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Executes logic associated with use service.
 */
export function useService(principal: string) {
  return useQuery({
    queryKey: ['service', principal],
    queryFn: () => api.getService(principal),
    enabled: !!principal,
  });
}
