import { Check, Circle, FileText, Headphones, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TOPIK_FOUNDATION_UNITS } from '../features/topik/learning/content';
import { useTopikLearningProgress } from '../features/topik/learning/useTopikLearningProgress';
import { useKoreanAudio } from '../features/topik/useKoreanAudio';
import { useTopikPractice } from '../features/topik/useTopikPractice';
import { useDataScope } from '../hooks/useDataScope';
import { topikPracticeApi } from '../lib/api';
import { useSettingsStore } from '../stores/settings-store';
import { AiAssistanceNotice } from '../components/feature/AiAssistanceNotice';
import { OwnerPrivateTopikPanel } from '../features/topik/OwnerPrivateTopikPanel';
import { TopikOwnerAuthoredCurriculum } from '../features/topik/curriculum/TopikOwnerAuthoredCurriculum';
import { useAuthStore } from '../stores/auth-store';
import { useTranslation } from 'react-i18next';
import type { TopikPracticeSolutionDto } from '@nihongo-n3/shared';
import { recordLearningActivity } from '../lib/activity-events';
import { useSearchParams } from 'react-router-dom';

export default function TopikLearn() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const progress = useTopikLearningProgress();
  const authUser = useAuthStore((state) => state.user);
  const audio = useKoreanAudio();
  const scope = useDataScope();
  const configuredInstructionLanguage = useSettingsStore((state) => state.instructionLanguages['topik-ko']);
  const [examLevel, setExamLevel] = useState<'TOPIK-I' | 'TOPIK-II'>('TOPIK-I');
  const requestedSection = searchParams.get('section');
  const initialSection = requestedSection === 'writing' || requestedSection === 'reading'
    ? requestedSection
    : 'listening';
  const [section, setSection] = useState<'listening' | 'writing' | 'reading'>(initialSection);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [solutions, setSolutions] = useState<Record<string, TopikPracticeSolutionDto>>({});
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const practice = useTopikPractice(scope, examLevel, section);
  const sections = useMemo(() => examLevel === 'TOPIK-I'
    ? (['listening', 'reading'] as const)
    : (['listening', 'writing', 'reading'] as const), [examLevel]);
  const selectLevel = (next: 'TOPIK-I' | 'TOPIK-II') => {
    setExamLevel(next);
    if (next === 'TOPIK-I' && section === 'writing') setSection('listening');
    setSolutionError(null);
  };
  const revealSolution = async (questionId: string) => {
    setSolutionError(null);
    const result = await topikPracticeApi.solution(questionId);
    if (!result.ok) {
      setSolutionError(result.message);
      return;
    }
    setSolutions((current) => ({ ...current, [questionId]: result.data }));
    const question = practice.data?.questions.find((item) => item.id === questionId);
    const selected = answers[questionId];
    if (question?.question_type === 'choice' && selected !== undefined && result.data.answer_index !== null) {
      void recordLearningActivity({
        event_type: 'quiz_answered',
        learning_track: 'topik-ko',
        content_type: 'topik_practice_question',
        content_id: questionId,
        level_tag: examLevel,
        section: question.section,
        correct: selected === result.data.answer_index,
      }).catch(() => undefined);
    }
  };
  const instructionText = (item: { prompt_ko: string; prompt_ja: string; prompt_en: string }) =>
    configuredInstructionLanguage === 'ko' ? item.prompt_ko : configuredInstructionLanguage === 'ja' ? item.prompt_ja : item.prompt_en;
  const explanationText = (item: { explanation_ko: string; explanation_ja: string; explanation_en: string }) =>
    configuredInstructionLanguage === 'ko' ? item.explanation_ko : configuredInstructionLanguage === 'ja' ? item.explanation_ja : item.explanation_en;
  const sampleText = (item: { sample_answer_ko: string | null; sample_answer_ja: string | null; sample_answer_en: string | null }) =>
    configuredInstructionLanguage === 'ko' ? item.sample_answer_ko : configuredInstructionLanguage === 'ja' ? item.sample_answer_ja : item.sample_answer_en;

  return (
    <div className="app-page">
      <header className="mb-6 max-w-[800px]">
        <p className="text-sm font-bold text-[var(--accent)]">{t('topik.learn.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-black">{t('topik.learn.title')}</h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.learn.description')}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {TOPIK_FOUNDATION_UNITS.map((unit) => {
          const complete = progress.completed.has(unit.id);
          return (
            <article key={unit.id} className="surface-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold text-[var(--accent)]">{t('topik.learn.unit', { order: unit.order })}</p><h2 className="mt-1 text-xl font-black">{unit.titleKo}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{unit.titleEn}</p></div>
                <button type="button" aria-pressed={complete} onClick={() => void progress.toggle(unit.id)} className={`touch-target inline-flex items-center justify-center rounded-[var(--radius-md)] border ${complete ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]'}`} title={complete ? t('topik.learn.markIncomplete') : t('topik.learn.markComplete')} aria-label={complete ? t('topik.learn.markIncomplete') : t('topik.learn.markComplete')}>
                  {complete ? <Check aria-hidden="true" size={19} /> : <Circle aria-hidden="true" size={19} />}
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">{unit.objectiveEn}</p>
              <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {unit.expressions.map((expression) => (
                  <li key={expression.ko} className="flex items-center gap-3 py-3">
                    <button type="button" onClick={() => audio.speakText(expression.ko)} className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-[var(--accent)]" aria-label={t('topik.learn.playExpression', { text: expression.ko })}>
                      <Volume2 aria-hidden="true" size={18} />
                    </button>
                    <span className="min-w-0"><span lang="ko" className="block font-bold">{expression.ko}</span><span className="mt-0.5 block text-sm text-[var(--muted-foreground)]">{expression.en}</span></span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      {audio.error && <p role="alert" className="mt-4 max-w-[800px] text-sm text-red-700 dark:text-red-300">{t(`topik.characters.audio.${audio.error}`)}</p>}

      <TopikOwnerAuthoredCurriculum initialGrade={Number(searchParams.get('grade') ?? 1)} />

      <section id="topik-practice" className="mt-10 max-w-[960px] scroll-mt-24 border-t border-[var(--border)] pt-8" aria-labelledby="topik-practice-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">{t('topik.practice.eyebrow')}</p>
            <h2 id="topik-practice-title" className="mt-2 text-2xl font-black">{t('topik.practice.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.practice.description')}</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted-foreground)]"><FileText aria-hidden="true" size={16} />{t('topik.practice.selfAuthored')}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={t('topik.practice.levelLabel')}>
          {(['TOPIK-I', 'TOPIK-II'] as const).map((level) => <button key={level} type="button" role="tab" aria-selected={examLevel === level} onClick={() => selectLevel(level)} className={`touch-target rounded-[var(--radius-md)] px-4 text-sm font-bold ${examLevel === level ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)]'}`}>{level.replace('-', ' ')}</button>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={t('topik.practice.sectionLabel')}>
          {sections.map((item) => <button key={item} type="button" role="tab" aria-selected={section === item} onClick={() => { setSection(item); setSolutionError(null); }} className={`touch-target rounded-[var(--radius-md)] px-4 text-sm font-bold ${section === item ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'border border-[var(--border)]'}`}>{t(`topik.sections.${item}`)}</button>)}
        </div>
        {examLevel === 'TOPIK-II' && section === 'writing' && (
          <AiAssistanceNotice tone="info">{t('topik.practice.aiWritingNotice')}</AiAssistanceNotice>
        )}

        {practice.isLoading && !practice.data && <p className="mt-6 text-sm text-[var(--muted-foreground)]">{t('topik.practice.loading')}</p>}
        {practice.isCached && <p role="status" className="mt-5 text-sm text-[var(--muted-foreground)]">{t('topik.practice.cached')}</p>}
        {practice.isUnavailableOffline && <div role="status" className="surface-panel mt-6 p-5"><p className="font-bold">{t('topik.practice.offlineTitle')}</p><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.practice.offlineDescription')}</p></div>}
        {practice.isError && !practice.data && !practice.isOffline && <p role="alert" className="mt-6 rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{practice.error.message}</p>}
        {solutionError && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{solutionError}</p>}
        <div className="mt-6 grid gap-4">
          {practice.data?.questions.map((question, index) => {
            const solution = solutions[question.id];
            const selected = answers[question.id];
            const canReveal = question.question_type === 'writing' || selected !== undefined;
            const audioSource = question.audio;
            return <article key={question.id} className="surface-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[var(--muted-foreground)]">
                <span>{t('topik.practice.questionNumber', { number: index + 1 })} · {question.skill}</span>
                {question.section === 'listening' && <span className="inline-flex items-center gap-1"><Headphones aria-hidden="true" size={15} />{t('topik.sections.listening')}</span>}
              </div>
              <h3 className="mt-3 text-lg font-black leading-8">{instructionText(question)}</h3>
              {audioSource && audioSource.kind !== 'unavailable' ? (
                <button type="button" onClick={() => audio.play(audioSource, { contentType: 'topik_practice_question', contentId: question.id, levelTag: examLevel, section: question.section })} className="mt-4 touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white"><Volume2 aria-hidden="true" size={18} />{audio.playing ? t('topik.placement.playing') : t('topik.practice.playAudio')}</button>
              ) : question.section === 'listening' ? (
                <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t('quiz.audioPending')}</p>
              ) : null}
              {question.question_type === 'choice' ? <fieldset className="mt-5 grid gap-2"><legend className="sr-only">{t('topik.practice.answerLabel')}</legend>{question.choices.map((choice, choiceIndex) => <button key={choice} type="button" role="radio" aria-checked={selected === choiceIndex} onClick={() => setAnswers((current) => ({ ...current, [question.id]: choiceIndex }))} className={`touch-target rounded-[var(--radius-md)] border px-4 py-3 text-left font-semibold ${selected === choiceIndex ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]'}`}><span className="mr-3 text-xs text-[var(--muted-foreground)]">{choiceIndex + 1}</span>{choice}</button>)}</fieldset> : <textarea value={drafts[question.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-5 min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3 text-sm leading-6" placeholder={t('topik.practice.writingPlaceholder')} aria-label={t('topik.practice.writingLabel')} />}
              {!solution && <button type="button" disabled={!canReveal} onClick={() => void revealSolution(question.id)} className="mt-5 touch-target rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-bold disabled:opacity-40">{t('topik.practice.reveal')}</button>}
              {solution && <div className="mt-5 border-t border-[var(--border)] pt-4 text-sm leading-6"><p className="font-bold text-[var(--accent)]">{t('topik.practice.explanation')}</p>{question.question_type === 'choice' && <p className="mt-2">{selected === solution.answer_index ? t('topik.practice.correct') : t('topik.practice.correctAnswer', { answer: question.choices[solution.answer_index ?? 0] })}</p>}<p className="mt-2 text-[var(--muted-foreground)]">{explanationText(solution)}</p>{sampleText(solution) && <><p className="mt-4 font-bold text-[var(--accent)]">{t('topik.practice.sample')}</p><p className="mt-2 whitespace-pre-wrap text-[var(--muted-foreground)]">{sampleText(solution)}</p></>}</div>}
            </article>;
          })}
          {practice.data && practice.data.questions.length === 0 && <div className="surface-panel p-5"><p className="font-bold">{t('topik.practice.emptyTitle')}</p><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.practice.emptyDescription')}</p></div>}
        </div>
      </section>
      {authUser?.role === 'admin' && <OwnerPrivateTopikPanel />}
    </div>
  );
}
