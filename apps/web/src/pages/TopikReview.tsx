import { useQuery } from '@tanstack/react-query';
import { BookOpenText, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TopikOwnerCurriculumSolutionDto } from '@nihongo-n3/shared';
import { TOPIK_FOUNDATION_UNITS } from '../features/topik/learning/content';
import { useTopikLearningProgress } from '../features/topik/learning/useTopikLearningProgress';
import { useKoreanAudio } from '../features/topik/useKoreanAudio';
import { useDataScope } from '../hooks/useDataScope';
import { topikOwnerCurriculumApi, topikPlacementApi } from '../lib/api';
import { useSettingsStore } from '../stores/settings-store';
import { useTranslation } from 'react-i18next';

export default function TopikReview() {
  const { t } = useTranslation();
  const scope = useDataScope();
  const configuredInstructionLanguage = useSettingsStore((state) => state.instructionLanguages['topik-ko']);
  const instructionLanguage = configuredInstructionLanguage;
  const progress = useTopikLearningProgress();
  const [revealed, setRevealed] = useState<{ itemId: string; data: TopikOwnerCurriculumSolutionDto } | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const audio = useKoreanAudio();
  const ownerDue = useQuery({
    queryKey: ['topik-owner-curriculum-due', scope],
    queryFn: async () => {
      const result = await topikOwnerCurriculumApi.due(1);
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    retry: false,
  });
  const mistakes = useQuery({
    queryKey: ['topik-placement-review', scope],
    queryFn: async () => { const result = await topikPlacementApi.review(); if (!result.ok) throw new Error(result.message); return result.data; },
    retry: false,
  });
  const incomplete = TOPIK_FOUNDATION_UNITS.filter((unit) => !progress.completed.has(unit.id));
  const card = ownerDue.data?.cards[0] ?? null;
  const revealOwnerSolution = async () => {
    if (!card) return;
    setReviewError(null);
    const result = await topikOwnerCurriculumApi.solution(card.item.id);
    if (!result.ok) {
      setReviewError(result.message);
      return;
    }
    setRevealed({ itemId: card.item.id, data: result.data });
  };
  const rateOwnerCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!card) return;
    setReviewBusy(true);
    setReviewError(null);
    const result = await topikOwnerCurriculumApi.review({ card_id: card.card_id, rating });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(result.message);
      return;
    }
    setRevealed(null);
    await ownerDue.refetch();
  };
  const currentSolution = revealed && revealed.itemId === card?.item.id ? revealed.data : null;
  const answerIndex = typeof currentSolution?.answer_payload.answer_index === 'number'
    ? currentSolution.answer_payload.answer_index
    : null;

  return (
    <div className="app-page max-w-[800px]">
      <p className="text-sm font-bold text-[var(--accent)]">{t('topik.review.eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-black">{t('topik.review.title')}</h1>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.review.description')}</p>

      <section className="mt-7 border-b border-[var(--border)] pb-7" aria-labelledby="topik-owner-fsrs-title">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-bold text-[var(--accent)]">FSRS-6</p><h2 id="topik-owner-fsrs-title" className="mt-1 font-black">TOPIK 1–6 복습</h2></div><Link to="/track/topik-ko/learn" className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-[var(--accent)]">학습 단위 열기 →</Link></div>
        {ownerDue.isLoading && <p className="mt-4 text-sm text-[var(--muted-foreground)]">복습 카드를 불러오는 중입니다.</p>}
        {ownerDue.isError && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{ownerDue.error.message}</p>}
        {!ownerDue.isLoading && !card && <div className="surface-panel mt-4 p-5"><p className="font-bold">대기 중인 TOPIK 복습이 없습니다.</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">학습 화면에서 정답과 해설을 확인한 항목이 여기에서 FSRS 복습으로 이어집니다.</p></div>}
        {card && <article className="surface-panel mt-4 p-5 sm:p-6">
          <p className="text-xs font-bold text-[var(--accent)]">{card.item.target_grade}급 · {card.item.item_type} · {card.state}</p>
          <h3 className="mt-3 text-lg font-black leading-8">{instructionLanguage === 'ko' ? card.item.prompt_ko : instructionLanguage === 'ja' ? card.item.prompt_ja : card.item.prompt_en}</h3>
          {card.item.audio?.kind === 'google' && <button type="button" onClick={() => void audio.play(card.item.audio!, { contentType: 'topik_owner_item', contentId: card.item.id, levelTag: String(card.item.target_grade), section: card.item.item_type })} className="mt-4 touch-target rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white">한국어 음성 재생</button>}
          {card.item.choices.length > 0 && <ul className="mt-4 grid gap-2">{card.item.choices.map((choice, index) => <li key={choice} className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-sm"><span className="mr-3 text-[var(--muted-foreground)]">{index + 1}</span>{choice}</li>)}</ul>}
          {!currentSolution && <button type="button" onClick={() => void revealOwnerSolution()} className="mt-5 touch-target rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-bold">정답과 해설 보기</button>}
          {currentSolution && <div className="mt-5 border-t border-[var(--border)] pt-4"><p className="text-sm font-bold text-[var(--accent)]">해설</p>{answerIndex !== null && <p className="mt-2 text-sm">정답: {card.item.choices[answerIndex] ?? String(answerIndex + 1)}</p>}<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{instructionLanguage === 'ko' ? currentSolution.explanation_ko : instructionLanguage === 'ja' ? currentSolution.explanation_ja : currentSolution.explanation_en}</p><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['again', 'hard', 'good', 'easy'] as const).map((rating) => <button key={rating} type="button" disabled={reviewBusy} onClick={() => void rateOwnerCard(rating)} className="touch-target rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-bold capitalize disabled:opacity-50">{rating === 'again' ? '다시' : rating === 'hard' ? '어려움' : rating === 'good' ? '보통' : '쉬움'}</button>)}</div></div>}
          {reviewError && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{reviewError}</p>}
          {audio.error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">한국어 발음을 재생할 수 없습니다.</p>}
        </article>}
      </section>

      <section className="mt-7">
        <h2 className="font-black">{t('topik.review.mistakes')}</h2>
        <div className="mt-3 grid gap-3">
          {mistakes.isLoading && <p className="text-sm text-[var(--muted-foreground)]">{t('topik.review.loading')}</p>}
          {mistakes.data?.map((item) => (
            <article key={item.question_id} className="surface-panel p-5">
              <p className="text-xs font-bold uppercase text-[var(--accent)]">{item.section}</p>
              <h3 className="mt-2 font-bold leading-7">{instructionLanguage === 'ko' ? item.prompt_ko : instructionLanguage === 'ja' ? item.prompt_ja : item.prompt_en}</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <p className="text-red-700 dark:text-red-300">{t('topik.review.yourAnswer', { answer: item.choices[item.selected_index] })}</p>
                <p className="text-[var(--success)]">{t('topik.review.correctAnswer', { answer: item.choices[item.answer_index] })}</p>
              </div>
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm leading-6 text-[var(--muted-foreground)]">{instructionLanguage === 'ko' ? item.explanation_ko : instructionLanguage === 'ja' ? item.explanation_ja : item.explanation_en}</p>
            </article>
          ))}
          {!mistakes.isLoading && mistakes.data?.length === 0 && <div className="surface-panel p-5"><p className="font-bold">{t('topik.review.noMistakes')}</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('topik.review.noMistakesDescription')}</p></div>}
        </div>
      </section>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 className="font-black">{t('topik.review.unfinished')}</h2>
        <div className="mt-3 grid gap-3">
          {incomplete.length > 0 ? incomplete.map((unit) => (
            <Link key={unit.id} to="/track/topik-ko/learn" className="surface-panel flex items-center gap-4 p-4 hover:border-[var(--accent)]">
              <BookOpenText aria-hidden="true" className="text-[var(--accent)]" />
              <span><span className="block font-bold">{unit.titleKo}</span><span className="text-sm text-[var(--muted-foreground)]">{unit.titleEn}</span></span>
            </Link>
          )) : <p className="text-sm text-[var(--muted-foreground)]">{t('topik.review.allComplete')}</p>}
        </div>
      </section>
      <Link to="/track/topik-ko/placement" className="mt-6 touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 font-bold text-white"><ClipboardCheck aria-hidden="true" size={18} /> {t('topik.review.openPlacement')}</Link>
    </div>
  );
}
