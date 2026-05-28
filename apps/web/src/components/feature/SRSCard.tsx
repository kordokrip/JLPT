/**
 * SRSCard — SRS 복습 카드 (3D 플립 애니메이션 + 평가 버튼)
 * Figma Make 디자인 적용
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { audioPlayer } from '../../lib/audio';
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

  const playAudio = () => {
    if (audioPath) audioPlayer.play(audioPath, reading || heading).catch(() => {/* ignore */});
  };

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
    <div className="w-full max-w-[880px] mx-auto" data-testid="review-card">
      {/* ── 3D 플립 카드 ── */}
      <div className="perspective-1000 mb-3">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={flipped}
          aria-label={flipped ? t('review.cardFlippedHint') : t('review.cardFrontHint')}
          className="relative w-full preserve-3d transition-transform duration-[500ms] cursor-pointer"
          style={{
            height: '280px',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            touchAction: 'pan-y',
          }}
          onClick={() => !flipped && setFlipped(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 앞면 */}
          <div
            data-testid="card-front"
            className="absolute inset-0 backface-hidden border-[0.5px] border-[var(--border)] rounded-2xl bg-card p-6 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center w-full">
              {/* SRS 상태 뱃지 */}
              <div className="mb-3">
                <span className="px-2 py-0.5 bg-[var(--accent-soft)] rounded-full text-[8px] text-[var(--accent)] font-medium uppercase tracking-[0.1em] inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                  {STATE_LABEL[card.state] ?? card.state}
                </span>
              </div>

              {/* 단어 */}
              <div className="font-serif-jp text-[56px] font-light text-foreground mb-1">
                {heading}
              </div>

              {partOfSpeech && (
                <div className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-[0.12em]">
                  {partOfSpeech}
                </div>
              )}

              <div className="absolute bottom-3 left-0 right-0 text-center">
                <p className="text-[10px] text-[var(--muted-foreground)] tracking-[0.04em]">
                  {t('review.tapToReveal')}
                </p>
              </div>
            </div>
          </div>

          {/* 뒷면 */}
          <div
            data-testid="card-back"
            className="absolute inset-0 backface-hidden border-[0.5px] border-[var(--border)] rounded-2xl bg-card p-6 flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* SRS 상태 뱃지 */}
            <div className="mb-2">
              <span className="px-2 py-0.5 bg-[var(--accent-soft)] rounded-full text-[8px] text-[var(--accent)] font-medium uppercase tracking-[0.1em] inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                {STATE_LABEL[card.state] ?? card.state}
              </span>
            </div>

            {/* 읽기 + 뜻 */}
            <div className="mb-2">
              {reading && (
                <div className="font-serif-jp text-[18px] font-light text-foreground mb-0.5 tracking-[0.06em]">
                  {reading}
                </div>
              )}
              <div className="font-pretendard text-[13px] text-foreground font-medium flex items-center gap-2">
                {meaning}
                {audioPath && (
                  <button
                    onClick={(e) => { e.stopPropagation(); playAudio(); }}
                    aria-label={t('browse.playPronunciation')}
                    className="text-[var(--muted-foreground)] hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 구분선 */}
            {example && <div className="border-t-[0.5px] border-[var(--border)] my-2" />}

            {/* 예문 */}
            {example && (
              <div>
              <div className="text-[8px] uppercase tracking-[0.12em] text-[var(--muted-foreground)] mb-1">{t('review.example')}</div>
                <p className="font-sans-jp text-[11px] text-[var(--muted-foreground)] text-jp-body mb-0.5">{example}</p>
                {exampleKo && <p className="font-pretendard text-[10px] text-[var(--muted-foreground)]">{exampleKo}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 평가 버튼 (뒷면일 때만) ── */}
      {flipped && (
        <>
          <div className="text-center mb-2">
            <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              {t('review.selectRating')}
            </p>
          </div>
          <div role="group" aria-label={t('review.ratingGroup')} className="grid grid-cols-4 gap-1.5">
            {RATING_KEYS.map(({ rating, border, hover, nextDay }) => (
              <button
                key={rating}
                data-rating={rating}
                disabled={loading}
                onClick={(e) => { e.stopPropagation(); onRate(rating); }}
                aria-label={`${t(`review.rating.${rating}`)} — ${nextDay}`}
                className={`flex flex-col items-center gap-0.5 py-2 bg-card border-[0.5px] ${border} rounded-lg ${hover} transition-all press-feedback disabled:opacity-40`}
              >
                <div className="font-pretendard text-[14px] font-medium text-foreground mb-0.5">{t(`review.rating.${rating}`)}</div>
                <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5">{nextDay}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
