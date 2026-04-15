import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_STALE_TIMES } from '@/lib/constants';

export function useReputation(principal: string | null) {
  return useQuery({
    queryKey: ['reputation', principal],
    queryFn: () => api.getReputation(principal!),
    enabled: !!principal,
    staleTime: QUERY_STALE_TIMES.reputation,
  });
}
