/**
 * useCurrentWeek — 학습 시작 시점 기반 동적 현재 주차 계산 (Phase 7-E)
 *
 * /srs/stats 의 firstCardCreatedAt 을 사용해
 * 오늘 날짜와의 차이를 주차로 환산한다.
 * 데이터 없으면 1주차, 최대 16주차.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface SrsStats {
  new: number;
  learning: number;
  review: number;
  relearning: number;
  firstCardCreatedAt: string | null;
}

export function useCurrentWeek(): { week: number; startedAt: Date | null; isLoading: boolean } {
  const { data, isLoading } = useQuery<SrsStats>({
    queryKey: ['srs-stats'],
    queryFn: async () => {
      const res = await api.get<SrsStats>('/srs/stats');
      return res.ok ? res.data : { new: 0, learning: 0, review: 0, relearning: 0, firstCardCreatedAt: null };
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!data?.firstCardCreatedAt) {
    return { week: 1, startedAt: null, isLoading };
  }

  const startedAt = new Date(data.firstCardCreatedAt);
  const diffMs    = Date.now() - startedAt.getTime();
  const diffDays  = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week      = Math.min(Math.floor(diffDays / 7) + 1, 16);

  return { week, startedAt, isLoading };
}
