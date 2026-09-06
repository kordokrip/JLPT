import { useQuery } from '@tanstack/react-query';

import { ownerPrivateTopikApi } from '../../lib/api';

export const OWNER_PRIVATE_FETCH_CACHE = 'no-store' as const;

/**
 * Owner-private content never enters Dexie or an offline queue. The account
 * scope remains in the in-memory key so an account switch cannot reuse data.
 */
export function ownerPrivateTopikQueryKey(
  scopeId: string,
  examLevel: 'TOPIK-I' | 'TOPIK-II',
  section: 'listening' | 'writing' | 'reading',
) {
  return ['owner-private-topik', scopeId, examLevel, section] as const;
}

export function useOwnerPrivateTopikContent(
  scopeId: string,
  examLevel: 'TOPIK-I' | 'TOPIK-II',
  section: 'listening' | 'writing' | 'reading',
  enabled: boolean,
) {
  return useQuery({
    queryKey: ownerPrivateTopikQueryKey(scopeId, examLevel, section),
    queryFn: async () => {
      const result = await ownerPrivateTopikApi.list(examLevel, section);
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    enabled,
    networkMode: 'online',
    staleTime: 0,
    gcTime: 0,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
