/**
 * Review — SRS 복습 세션
 * Figma Make 디자인 적용 + 실제 API 데이터 연결
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDueCards, useInitCards, useReviewCard } from '../hooks/useSRS';
import { useVocabItem, useVocabList } from '../hooks/useVocab';
import { SRSCard } from '../components/feature/SRSCard';
import type { Rating } from '../lib/fsrs-client';
import type { SrsCard } from '../lib/db';

export default function Review() {
  const { t } = useTranslation();
  const { cards, refetch } = useDueCards(undefined, 50);
  const { review, reviewing } = useReviewCard();
  const starterVocab = useVocabList('N3', 10);
  const initCards = useInitCards();
  const [reviewed, setReviewed] = useState(0);

  const current = cards[0];
  const total   = cards.length + reviewed;

  const handleRate = async (rating: Rating) => {
    if (!current) return;
    await review(current, rating);
    setReviewed((n) => n + 1);
  };

  const handleStartCards = async () => {
    const ids = starterVocab.items.slice(0, 10).map((item) => item.id);
    if (ids.length === 0) return;
    const res = await initCards.mutateAsync({ item_type: 'vocab', item_ids: ids });
    if (res.ok) await refetch();
  };

  /* 완료 화면 */
  if (!current && reviewed > 0) {
    return (
      <div className="max-w-[880px] mx-auto px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="font-serif-jp text-[48px] font-normal text-foreground mb-4">
            {t('review.sessionCompleteTitle')}
          </h1>
          <p className="font-pretendard text-[15px] text-[var(--muted-foreground)] mb-8">
            {t('review.sessionDone', { count: reviewed })}
          </p>
          <Link
            to="/"
            className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity press-feedback inline-block"
          >
            {t('review.backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  /* 빈 상태 */
  if (cards.length === 0 && reviewed === 0) {
    const canStart = starterVocab.items.length > 0 && !initCards.isPending;
    return (
      <div className="max-w-[880px] mx-auto px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="font-serif-jp text-[36px] font-normal text-foreground mb-3">{t('review.emptyTitle')}</h1>
          <p className="font-pretendard text-[15px] text-[var(--muted-foreground)] mb-4">{t('review.noDueCards')}</p>
          <div className="max-w-[460px] mx-auto rounded-xl border-[0.5px] border-[var(--border)] bg-card p-4 mb-8 text-left">
            <p className="text-[13px] font-medium text-foreground mb-1">{t('review.starterTitle')}</p>
            <p className="text-[12px] leading-5 text-[var(--muted-foreground)]">{t('review.starterDesc')}</p>
            {initCards.isError && (
              <p className="text-[12px] text-red-600 mt-2" role="alert">{t('review.starterError')}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={handleStartCards}
              disabled={!canStart}
              className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-lg text-[13px] hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {initCards.isPending || starterVocab.loading ? t('common.loading') : t('review.startStarterCards')}
            </button>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 border-[0.5px] border-[var(--border)] text-foreground rounded-lg text-[13px] hover:bg-accent-soft-20 transition-colors"
            >
              {t('common.refresh')}
            </button>
            <Link
              to="/"
              className="px-5 py-2.5 border-[0.5px] border-[var(--border)] text-foreground rounded-lg text-[13px] hover:bg-accent-soft-20 transition-colors"
            >
              {t('review.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[880px] mx-auto px-7 py-5">
      {/* ── 헤더 ── */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-serif-jp text-[22px] font-normal text-foreground leading-none">{t('nav.review')}</h1>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{t('review.subtitle')}</p>
        </div>
        <div className="text-right">
          <div className="font-medium text-[18px] text-foreground">
            {t('review.progress', { done: reviewed + 1, total })}
          </div>
          <div className="text-[9px] text-[var(--muted-foreground)]">{t('review.completed', { count: reviewed })}</div>
        </div>
      </div>

      {/* ── 진행 바 ── */}
      <div className="w-full h-[2px] bg-[var(--border)] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${total > 0 ? ((reviewed) / total) * 100 : 0}%` }}
        />
      </div>

      {/* ── SRS 카드 ── */}
      {current && (
        <VocabReviewCard card={current} onRate={handleRate} loading={reviewing} />
      )}
    </div>
  );
}

/** 어휘 카드 리뷰 — 아이템 데이터 fetch */
function VocabReviewCard({
  card, onRate, loading,
}: {
  card: SrsCard;
  onRate: (r: Rating) => void;
  loading: boolean;
}) {
  const { item } = useVocabItem(card.item_id);

  if (!item) {
    return (
      <div
        className="border-[0.5px] border-[var(--border)] rounded-2xl bg-card flex items-center justify-center"
        style={{ height: '220px' }}
      >
        <span className="h-6 w-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <SRSCard
      card={card}
      heading={item.word}
      {...(item.reading       ? { reading:       item.reading       } : {})}
      meaning={item.meaning}
      {...(item.part_of_speech ? { partOfSpeech: item.part_of_speech } : {})}
      {...(item.example_jp    ? { example:       item.example_jp    } : {})}
      {...(item.example_ko    ? { exampleKo:     item.example_ko    } : {})}
      {...(item.audio_path    ? { audioPath:     item.audio_path    } : {})}
      onRate={onRate}
      loading={loading}
    />
  );
}
