import { useQuery } from '@tanstack/react-query';

import { activityApi } from '../lib/api';
import { useDataScope } from './useDataScope';

export function useLearningActivitySummary(window: '7d' | '30d' = '30d') {
  const scope = useDataScope();
  return useQuery({
    queryKey: ['learning-activity-summary', scope, window],
    queryFn: async () => {
      const result = await activityApi.summary(window);
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    staleTime: 60_000,
    retry: 1,
  });
}
