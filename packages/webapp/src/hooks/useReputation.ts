import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Executes logic associated with use reputation.
 */
export function useReputation(principal: string | null) {
  return useQuery({
    queryKey: ['reputation', principal],
    queryFn: () => api.getReputation(principal!),
    enabled: !!principal,
    staleTime: 60 * 1000, // 1 minute
  });
}
