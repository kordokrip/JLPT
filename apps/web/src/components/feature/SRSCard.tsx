/**
 * SRSCard — SRS 복습 카드 (3D 플립 애니메이션 + 평가 버튼)
 * Figma Make 디자인 적용
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PronunciationButton } from './PronunciationButton';
import { audioPlayer } from '../../lib/audio';
import { useSettingsStore } from '../../stores/settings-store';
import type { SrsCard } from '../../lib/db';
import type { Rating } from '../../lib/fsrs-client';

interface SRSCardProps {
  card:      SrsCard;
  heading:   string;   /** 앞면: 단어/한자 */
  reading?:  string;   /** 읽기 */
  meaning:   string;   /** 뜻 (한국어) */
  partOfSpeech?: string;
  example?:  string;   /** 예문 (일본어) */
  exampleKo?: string;  /** 예문 번역 */
  audioPath?: string | undefined;
  onRate:    (rating: Rating) => void;
  loading?:  boolean;
}

const RATING_KEYS: { rating: Rating; border: string; hover: string; nextDay: string }[] = [
  { rating: 'again', border: 'border-[var(--accent)]',  hover: 'hover:bg-accent-soft-20', nextDay: '< 1m' },
  { rating: 'hard',  border: 'border-[var(--border)]',  hover: 'hover:bg-accent-soft-10', nextDay: '10m' },
  { rating: 'good',  border: 'border-[var(--success)]', hover: 'hover:bg-[#5C7F4F]/10',   nextDay: '1d' },
  { rating: 'easy',  border: 'border-[var(--info)]',    hover: 'hover:bg-[#6B7F8C]/10',   nextDay: '4d' },
];

const STATE_LABEL: Record<string, string> = {
  new: 'New', learning: 'Learning', review: 'Apprentice', relearning: 'Again',
};

export function SRSCard({
  card, heading, reading, meaning, partOfSpeech, example, exampleKo, audioPath, onRate, loading = false,
}: SRSCardProps) {
  const { t } = useTranslation();
  const autoPronounce = useSettingsStore((s) => s.autoPronounce);
  const [flipped, setFlipped] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
    touchStartY.current = e.touches[0]?.clientY ?? 0;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dy = Math.abs((e.changedTouches[0]?.clientY ?? 0) - touchStartY.current);
    // 수평 스와이프이고, 수직 이동보다 크면
    if (Math.abs(dx) > 60 && Math.abs(dx) > dy * 1.5) {
      if (!flipped) { setFlipped(true); return; }
      if (dx < 0) onRate('again'); // 왼쪽 = Again
      else         onRate('good');  // 오른쪽 = Good
    }
  };

  useEffect(() => {
    setFlipped(false);
    if (autoPronounce) {
      audioPlayer.playPronunciation({ text: reading || heading, audioPath }).catch(() => {/* ignore */});
    }
  }, [audioPath, autoPronounce, heading, reading]);

  /* 키보드 단축키 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      } else if (flipped) {
        if (e.key === '1') onRate('again');
        else if (e.key === '2') onRate('hard');
        else if (e.key === '3') onRate('good');
        else if (e.key === '4') onRate('easy');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onRate]);

  return (
    <div className="mx-auto w-full max-w-[760px]" data-testid="review-card">
      {/* ── 3D 플립 카드 ── */}
      <div className="perspective-1000 mb-3">
        <div
          className="relative w-full preserve-3d transition-transform duration-[500ms]"
          style={{
            height: 'clamp(320px, 54vh, 390px)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            touchAction: 'pan-y',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 앞면 */}
          <button
            type="button"
            data-testid="card-front"
            aria-expanded={flipped}
            aria-label={flipped ? t('review.cardFlippedHint') : t('review.cardFrontHint')}
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-xl)] border-[0.5px] border-[var(--border)] bg-card p-6 text-left shadow-[var(--shadow-soft)] backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
            onClick={() => !flipped && setFlipped(true)}
          >
            <div className="text-center w-full">
              {/* SRS 상태 뱃지 */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium uppercase text-[var(--accent)]">
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                  {STATE_LABEL[card.state] ?? card.state}
                </span>
              </div>

              {/* 단어 */}
              <div className="break-all font-serif-jp text-[clamp(2.75rem,14vw,4.25rem)] font-light leading-tight text-foreground">
                {heading}
              </div>

              {partOfSpeech && (
                <div className="mt-2 text-xs uppercase text-[var(--muted-foreground)]">
                  {partOfSpeech}
                </div>
              )}

              <div className="absolute bottom-5 left-0 right-0 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t('review.tapToReveal')}
                </p>
              </div>
            </div>
          </button>

          {/* 뒷면 */}
          <div
            data-testid="card-back"
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-xl)] border-[0.5px] border-[var(--border)] bg-card p-5 shadow-[var(--shadow-soft)] backface-hidden sm:p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* SRS 상태 뱃지 */}
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium uppercase text-[var(--accent)]">
                <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                {STATE_LABEL[card.state] ?? card.state}
              </span>
            </div>

            {/* 읽기 + 뜻 */}
            <div className="mb-3">
              {reading && (
                <div className="mb-1 font-serif-jp text-xl font-light tracking-wide text-foreground">
                  {reading}
                </div>
              )}
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="min-w-0">{meaning}</span>
                <PronunciationButton
                  compact
                  text={reading || heading}
                  audioPath={audioPath}
                  label={t('browse.playPronunciation')}
                  className="border-0 bg-transparent p-1"
                />
              </div>
            </div>

            {/* 구분선 */}
            {example && <div className="my-3 border-t-[0.5px] border-[var(--border)]" />}

            {/* 예문 */}
            {example && (
              <div className="min-h-0 overflow-y-auto pr-1">
                <div className="mb-1 text-xs uppercase text-[var(--muted-foreground)]">{t('review.example')}</div>
                <div className="flex items-start justify-between gap-3">
                  <p className="mb-1 font-sans-jp text-sm text-[var(--text-secondary)] text-jp-body">{example}</p>
                  <PronunciationButton compact text={example} label={t('browse.playExamplePronunciation')} />
                </div>
                {exampleKo && <p className="text-sm leading-6 text-[var(--muted-foreground)]">{exampleKo}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 평가 버튼 (뒷면일 때만) ── */}
      {flipped && (
        <>
          <div className="mb-2 text-center">
            <p className="text-xs uppercase text-[var(--muted-foreground)]">
              {t('review.selectRating')}
            </p>
          </div>
          <div role="group" aria-label={t('review.ratingGroup')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATING_KEYS.map(({ rating, border, hover, nextDay }) => (
              <button
                key={rating}
                data-rating={rating}
                disabled={loading}
                onClick={(e) => { e.stopPropagation(); onRate(rating); }}
                aria-label={`${t(`review.rating.${rating}`)} — ${nextDay}`}
                className={`touch-target flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] border-[0.5px] bg-card py-2 ${border} ${hover} transition-all press-feedback disabled:opacity-40`}
              >
                <div className="text-sm font-semibold text-foreground">{t(`review.rating.${rating}`)}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{nextDay}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
