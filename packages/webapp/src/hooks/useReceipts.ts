import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useReceipts(params?: {
  seller_principal?: string;
  buyer_principal?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: () => api.getReceipts(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Executes logic associated with use receipt.
 */
export function useReceipt(id: string) {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: () => api.getReceipt(id),
    enabled: !!id,
  });
}
