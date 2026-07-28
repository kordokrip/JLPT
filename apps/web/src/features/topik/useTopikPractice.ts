import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import type { TopikPracticeListDto } from '@nihongo-n3/shared';
import { topikPracticeApi } from '../../lib/api';
import { useTrackStatus } from '../../hooks/useTrackStatus';
import { useUiStore } from '../../stores/ui-store';
import {
  readTopikPracticeCache,
  saveTopikPracticeCache,
  type TopikPracticeExamLevel,
  type TopikPracticeSection,
} from './practice-cache';

/**
 * Caches only public prompts locally. Explanations and answers remain behind
 * the authenticated API and are never persisted by the PWA.
 */
export function useTopikPractice(
  scopeId: string,
  examLevel: TopikPracticeExamLevel,
  section: TopikPracticeSection,
) {
  const isOnline = useUiStore((state) => state.isOnline);
  const { status } = useTrackStatus();
  const contentRelease = status?.track === 'topik-ko'
    ? status.content_release
    : 'foundation-only';
  const cached = useLiveQuery(
    () => readTopikPracticeCache(scopeId, contentRelease, examLevel, section),
    [scopeId, contentRelease, examLevel, section],
  );
  const query = useQuery({
    queryKey: ['topik-practice', scopeId, contentRelease, examLevel, section],
    queryFn: async (): Promise<TopikPracticeListDto> => {
      const result = await topikPracticeApi.list(examLevel, section);
      if (!result.ok) throw new Error(result.message);
      await saveTopikPracticeCache(scopeId, contentRelease, result.data);
      return result.data;
    },
    enabled: isOnline,
    networkMode: 'online',
    retry: 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const data = query.data ?? cached?.payload;
  return {
    ...query,
    data,
    isOffline: !isOnline,
    isCached: query.data === undefined && cached !== undefined,
    isUnavailableOffline: !isOnline && data === undefined,
  };
}
