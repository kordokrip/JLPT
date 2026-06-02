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
import { Button, Card, Progress } from '../components/ui';
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
      <div className="app-page flex min-h-[70vh] items-center justify-center">
        <Card elevated className="w-full max-w-[520px] p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mb-4 font-serif-jp text-[var(--text-2xl)] font-normal text-foreground">
            {t('review.sessionCompleteTitle')}
          </h1>
          <p className="mb-8 text-sm text-[var(--muted-foreground)]">
            {t('review.sessionDone', { count: reviewed })}
          </p>
          <Button asChild size="lg">
            <Link to="/">{t('review.backToHome')}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  /* 빈 상태 */
  if (cards.length === 0 && reviewed === 0) {
    const canStart = starterVocab.items.length > 0 && !initCards.isPending;
    return (
      <div className="app-page flex min-h-[70vh] items-center justify-center">
        <Card elevated className="w-full max-w-[620px] p-6 text-center sm:p-8">
          <h1 className="mb-3 font-serif-jp text-[var(--text-2xl)] font-normal text-foreground">{t('review.emptyTitle')}</h1>
          <p className="mb-5 text-sm leading-6 text-[var(--muted-foreground)]">{t('review.noDueCards')}</p>
          <div className="surface-panel mx-auto mb-7 max-w-[480px] p-4 text-left">
            <p className="mb-1 text-sm font-semibold text-foreground">{t('review.starterTitle')}</p>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t('review.starterDesc')}</p>
            {initCards.isError && (
              <p className="text-[12px] text-red-600 mt-2" role="alert">{t('review.starterError')}</p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              onClick={handleStartCards}
              disabled={!canStart}
              size="lg"
            >
              {initCards.isPending || starterVocab.loading ? t('common.loading') : t('review.startStarterCards')}
            </Button>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="lg"
            >
              {t('common.refresh')}
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/">{t('review.backToHome')}</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-page">
      {/* ── 헤더 ── */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif-jp text-[var(--text-xl)] font-normal leading-tight text-foreground">{t('nav.review')}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('review.subtitle')}</p>
        </div>
        <div data-visual-dynamic className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-3 py-2 text-right">
          <div className="text-base font-semibold text-foreground">
            {t('review.progress', { done: reviewed + 1, total })}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">{t('review.completed', { count: reviewed })}</div>
        </div>
      </div>

      {/* ── 진행 바 ── */}
      <Progress data-visual-dynamic value={total > 0 ? reviewed : 0} max={Math.max(total, 1)} size="sm" className="mb-5" />

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
