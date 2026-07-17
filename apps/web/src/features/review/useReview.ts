import { useState } from 'react';
import { useDueCards, useInitCards, useReviewCard } from '../../hooks/useSRS';
import { useVocabList } from '../../hooks/useVocab';
import { reviewScreen, reviewTotal, starterVocabIds } from './logic';
import type { ReviewViewProps } from './types';
import type { Rating } from '../../lib/fsrs-client';

/**
 * Composes review data without moving the SRS user x track namespace out of
 * its owning hooks. useDueCards/useReviewCard retain localUserIdFor scope.
 */
export function useReview(): ReviewViewProps {
  const { cards, refetch } = useDueCards(undefined, 50);
  const { review, reviewing } = useReviewCard();
  const starter = useVocabList('N3', 10);
  const initCards = useInitCards();
  const [reviewed, setReviewed] = useState(0);

  const current = cards[0];
  const total = reviewTotal(cards.length, reviewed);

  const onRate = async (rating: Rating) => {
    if (!current) return;
    await review(current, rating);
    setReviewed((count) => count + 1);
  };

  const onStartCards = async () => {
    const itemIds = starterVocabIds(starter.items);
    if (itemIds.length === 0) return;

    const result = await initCards.mutateAsync({ item_type: 'vocab', item_ids: itemIds });
    if (result.ok) await refetch();
  };

  return {
    screen: reviewScreen(cards.length, reviewed),
    current,
    reviewed,
    total,
    reviewing,
    starterVocab: starter.items,
    starterLoading: starter.loading,
    starterPending: initCards.isPending,
    starterError: initCards.isError,
    onRate,
    onStartCards,
    onRefresh: refetch,
  };
}
