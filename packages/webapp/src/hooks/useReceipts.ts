import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_STALE_TIMES } from '@/lib/constants';

export function useReceipts(params?: {
  seller_principal?: string;
  buyer_principal?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: () => api.getReceipts(params),
    staleTime: QUERY_STALE_TIMES.receipts,
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: () => api.getReceipt(id),
    enabled: !!id,
  });
}
