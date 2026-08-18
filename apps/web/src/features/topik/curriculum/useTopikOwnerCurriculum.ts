import { useQuery } from '@tanstack/react-query';
import type { TopikOwnerCurriculumListDto } from '@nihongo-n3/shared';

import { topikOwnerCurriculumApi } from '../../../lib/api';
import { useUiStore } from '../../../stores/ui-store';

/** The API remains the source of truth; Google browser speech is never put in a PWA cache. */
export function useTopikOwnerCurriculum(scopeId: string, targetGrade: number) {
  const isOnline = useUiStore((state) => state.isOnline);
  return useQuery({
    queryKey: ['topik-owner-authored-curriculum', scopeId, targetGrade],
    queryFn: async (): Promise<TopikOwnerCurriculumListDto> => {
      const result = await topikOwnerCurriculumApi.list(targetGrade);
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    enabled: isOnline,
    networkMode: 'online',
    retry: 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
