/**
 * useSRS — SRS 카드 관리 훅 (IDB first + 서버 sync)
 */
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, localUserIdFor, type SrsCard, type ItemType, type Rating } from '../lib/db';
import { srsApi } from '../lib/api';
import { schedule, isDue } from '../lib/fsrs-client';
import { enqueue } from '../lib/sync';
import { isOnline } from '../lib/browser';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';

/** 오늘 due 카드 목록 (IDB + 서버 병합) */
export function useDueCards(itemType?: ItemType, limit = 20) {
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const track = useSettingsStore((s) => s.learningTrack);
  const localUserId = localUserIdFor(authUserId, track);

  // IDB에서 즉시 반환 (reactive)
  const localCards = useLiveQuery(
    () => {
      const now = new Date();
      return db.srs_cards
        .where('user_id')
        .equals(localUserId)
        .and((c) => isDue(c.due_at, now) && (!itemType || c.item_type === itemType))
        .limit(limit)
        .toArray();
    },
    [localUserId, itemType, limit],
  );

  // 서버 due 목록 주기적 동기화 (10분 stale)
  const { refetch, isLoading } = useQuery({
    queryKey: ['srs', 'due', localUserId, itemType],
    queryFn: async () => {
      const result = await srsApi.due({ ...(itemType !== undefined ? { item_type: itemType } : {}), limit: 100 });
      if (!result.ok) return [];
      // 서버 카드를 IDB에 upsert
      await db.srs_cards.bulkPut(
        result.data.map((c) => ({ ...c, user_id: localUserId })),
      );
      return result.data;
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  return { cards: localCards ?? [], refetch, isLoading: localCards === undefined || isLoading };
}

/** SRS 통계 */
export function useSrsStats() {
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const track = useSettingsStore((s) => s.learningTrack);
  const localUserId = localUserIdFor(authUserId, track);
  return useQuery({
    queryKey: ['srs', 'stats', localUserId],
    queryFn: async () => {
      const res = await srsApi.stats();
      return res.ok ? res.data : null;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

/** 리뷰 수행 */
export function useReviewCard() {
  const qc = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const track = useSettingsStore((s) => s.learningTrack);
  const localUserId = localUserIdFor(authUserId, track);

  const review = useCallback(
    async (card: SrsCard, rating: Rating) => {
      setReviewing(true);
      try {
        const now = new Date();
        const snapshot = {
          state:          card.state,
          stability:      card.stability,
          difficulty:     card.difficulty,
          lapses:         card.lapses,
          reps:           card.reps,
          lastReviewedAt: card.updated_at ? new Date(card.updated_at) : null,
        };
        const result = schedule(snapshot, rating, now);

        // IDB 낙관적 업데이트
        const updated: Partial<SrsCard> = {
          state:      result.state,
          stability:  result.stability,
          difficulty: result.difficulty,
          lapses:     result.lapses,
          reps:       result.reps,
          due_at:     result.dueAt.toISOString(),
          updated_at: now.toISOString(),
        };
        await db.srs_cards
          .where('[user_id+item_type+item_id]')
          .equals([localUserId, card.item_type, card.item_id])
          .modify(updated);

        const syncPayload = {
          ...(card.id !== undefined ? { card_id: card.id } : {}),
          item_type:   card.item_type,
          item_id:     card.item_id,
          rating,
          reviewed_at: now.toISOString(),
        };

        if (card.id !== undefined && isOnline()) {
          const serverRes = await srsApi.review(card.id, rating);
          if (!serverRes.ok) await enqueue('review', syncPayload);
        } else {
          await enqueue('review', syncPayload);
        }

        qc.invalidateQueries({ queryKey: ['srs'] });
      } finally {
        setReviewing(false);
      }
    },
    [localUserId, qc],
  );

  return { review, reviewing };
}

/** SRS 카드 초기화 (서버 등록) */
export function useInitCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ item_type, item_ids }: { item_type: ItemType; item_ids: number[] }) =>
      srsApi.init(item_type, item_ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['srs'] }),
  });
}
