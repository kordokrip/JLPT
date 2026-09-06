/**
 * useSRS — SRS 카드 관리 훅 (IDB first + 서버 sync)
 */
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, localUserIdFor, type SrsCard, type ItemType, type Rating } from '../lib/db';
import { srsApi } from '../lib/api';
import { schedule } from '../lib/fsrs-client';
import { canApplyServerDueSnapshot, selectDueCardSnapshots, srsCardIdentity } from '../lib/srs-due-snapshot';
import { enqueue } from '../lib/sync';
import { isOnline } from '../lib/browser';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';

/** 오늘 due 카드 목록 (IDB + 서버 병합) */
export function useDueCards(itemType?: ItemType, limit = 20) {
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const track = useSettingsStore((s) => s.learningTrack);
  const localUserId = localUserIdFor(authUserId, track);

  // 서버 due 목록 주기적 동기화 (10분 stale)
  const { data: serverDueCards = [], refetch, isLoading } = useQuery({
    queryKey: ['srs', 'due', localUserId, itemType],
    queryFn: async () => {
      const beforeCards = await db.srs_cards.where('user_id').equals(localUserId).toArray();
      const before = new Map(beforeCards.map((card) => [srsCardIdentity(card), card]));
      const result = await srsApi.due({ ...(itemType !== undefined ? { item_type: itemType } : {}), limit: 100 });
      if (!result.ok) return [];
      const snapshots = result.data
        .filter((card) => card.user_id === authUserId
          && (!('learning_track' in card) || card.learning_track === track))
        .map((card) => ({ ...card, user_id: localUserId }));
      // Do not overwrite reviews made while the request was in flight, or
      // newer local repetitions waiting for sync. Preserve actual FSRS dates.
      await db.transaction('rw', db.srs_cards, async () => {
        const currentCards = await db.srs_cards.where('user_id').equals(localUserId).toArray();
        const current = new Map(currentCards.map((card) => [srsCardIdentity(card), card]));
        const applicable = snapshots.filter((card) => canApplyServerDueSnapshot(
          card, current.get(srsCardIdentity(card)), before.get(srsCardIdentity(card)),
        ));
        if (applicable.length) await db.srs_cards.bulkPut(applicable);
      });
      return snapshots;
    },
    enabled: !!authUserId && track === 'jlpt-ja',
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  // Retain future-by-device cards so a server due snapshot can authorize them.
  // The exact snapshot comparison stops cached server data reviving a review.
  const localCards = useLiveQuery(
    () => db.srs_cards.where('user_id').equals(localUserId).toArray(),
    [localUserId],
  );
  const cards = selectDueCardSnapshots(localCards ?? [], serverDueCards, localUserId, itemType, limit);
  return { cards, refetch, isLoading: localCards === undefined || isLoading };
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
