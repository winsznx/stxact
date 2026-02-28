import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDisputes(params?: {
  seller_principal?: string;
  buyer_principal?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['disputes', params],
    queryFn: () => api.getDisputes(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useDispute(id: string) {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: () => api.getDispute(id),
    enabled: !!id,
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      receipt_id: string;
      reason: string;
      evidence?: Record<string, unknown>;
      buyer_signature?: string;
      timestamp?: number;
    }) =>
      api.createDispute(data),
    onSuccess: () => {
      // Invalidate disputes list to refetch
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}

export function useUpdateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; resolution_notes?: string } }) =>
      api.updateDispute(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both the specific dispute and the list
      queryClient.invalidateQueries({ queryKey: ['dispute', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}

export function useSubmitRefundAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.submitRefundAuthorization,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute', variables.dispute_id] });
    },
  });
}
