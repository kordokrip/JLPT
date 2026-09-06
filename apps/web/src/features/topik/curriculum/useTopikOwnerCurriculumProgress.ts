import { useQuery } from '@tanstack/react-query';
import type { TopikOwnerCurriculumProgressDto } from '@nihongo-n3/shared';

import { topikOwnerCurriculumApi } from '../../../lib/api';
import { useUiStore } from '../../../stores/ui-store';

/** Owner curriculum progress is account data, never a device-local completion flag. */
export function useTopikOwnerCurriculumProgress(scopeId: string) {
  const isOnline = useUiStore((state) => state.isOnline);
  return useQuery({
    queryKey: ['topik-owner-curriculum-progress', scopeId],
    queryFn: async (): Promise<TopikOwnerCurriculumProgressDto> => {
      const result = await topikOwnerCurriculumApi.progress();
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    enabled: isOnline,
    networkMode: 'online',
    retry: 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
