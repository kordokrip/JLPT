import { useQuery } from '@tanstack/react-query';
import { useDataScope } from '../../hooks/useDataScope';
import { logsApi } from '../../lib/api';
import type { StreakData } from './types';

export async function fetchStreak(): Promise<StreakData> {
  const res = await logsApi.streak();
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

/** Keeps statistics queries isolated by authenticated user and learning track. */
export function useStats() {
  const dataScope = useDataScope();

  return useQuery<StreakData>({
    queryKey: ['streak', dataScope],
    queryFn: fetchStreak,
    staleTime: 5 * 60 * 1000,
  });
}
