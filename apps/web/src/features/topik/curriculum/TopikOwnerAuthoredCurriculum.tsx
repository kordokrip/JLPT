import { Headphones, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { TopikOwnerCurriculumItemDto, TopikOwnerCurriculumSolutionDto } from '@nihongo-n3/shared';

import { topikOwnerCurriculumApi } from '../../../lib/api';
import { useDataScope } from '../../../hooks/useDataScope';
import { useSettingsStore } from '../../../stores/settings-store';
import { useKoreanAudio } from '../useKoreanAudio';
import { useTopikOwnerCurriculum } from './useTopikOwnerCurriculum';

const GRADES = [1, 2, 3, 4, 5, 6] as const;

function localized(
  item: Pick<TopikOwnerCurriculumItemDto, 'prompt_ko' | 'prompt_ja' | 'prompt_en'>,
  language: 'ko' | 'ja' | 'en',
) {
  return language === 'ko' ? item.prompt_ko : language === 'ja' ? item.prompt_ja : item.prompt_en;
}

function solutionText(
  item: TopikOwnerCurriculumSolutionDto,
  language: 'ko' | 'ja' | 'en',
) {
  return language === 'ko' ? item.explanation_ko : language === 'ja' ? item.explanation_ja : item.explanation_en;
}

export function TopikOwnerAuthoredCurriculum({ initialGrade = 1 }: { initialGrade?: number }) {
  const { t } = useTranslation();
  const [itemIndex, setItemIndex] = useState(0);
  const [completing, setCompleting] = useState(false);
  const scope = useDataScope();
  const language = useSettingsStore((state) => state.instructionLanguages['topik-ko']);
  const [grade, setGrade] = useState<number>(GRADES.includes(initialGrade as (typeof GRADES)[number]) ? initialGrade : 1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [solutions, setSolutions] = useState<Record<string, TopikOwnerCurriculumSolutionDto>>({});
  const [completedItems, setCompletedItems] = useState<Set<string>>(() => new Set());
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const curriculum = useTopikOwnerCurriculum(scope, grade);
  const audio = useKoreanAudio();
  const queryClient = useQueryClient();

  const selectGrade = (nextGrade: number) => {
    setGrade(nextGrade);
    setSelectedUnitId(null);
    setAnswers({});
    setSolutions({});
    setSolutionError(null);
  };
  const revealSolution = async (itemId: string) => {
    setSolutionError(null);
    const result = await topikOwnerCurriculumApi.solution(itemId);
    if (!result.ok) {
      setSolutionError(result.message);
      return;
    }
    setSolutions((current) => ({ ...current, [itemId]: result.data }));
  };
  const completeItem = async (itemId: string) => {
    if (completing || !solutions[itemId]) return;
    setCompleting(true);
    const completion = await topikOwnerCurriculumApi.complete(itemId);
    setCompleting(false);
    if (!completion.ok) {
      setSolutionError(completion.message);
      return;
    }
    setCompletedItems((current) => new Set(current).add(itemId));
    void queryClient.invalidateQueries({ queryKey: ['topik-owner-authored-curriculum', scope] });
    void queryClient.invalidateQueries({ queryKey: ['topik-owner-curriculum-progress', scope] });
  };
  const selectedUnit = curriculum.data?.units.find((unit) => unit.id === selectedUnitId) ?? null;

  return (
    <section id="topik-owner-curriculum" className="mt-10 max-w-[960px] scroll-mt-24 border-t border-[var(--border)] pt-8" aria-labelledby="topik-owner-curriculum-title">
      <p className="text-sm font-bold text-[var(--accent)]">TOPIK 1–6</p>
      <h2 id="topik-owner-curriculum-title" className="mt-2 text-2xl font-black">{t('study.owner')}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{t('study.revealOnly')}</p>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={t('study.target')}>
        {GRADES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={grade === item}
            onClick={() => selectGrade(item)}
            className={`touch-target rounded-[var(--radius-md)] px-4 text-sm font-bold ${grade === item ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)]'}`}
          >{t('study.grade', { level: item })}</button>
        ))}
      </div>

      {curriculum.isLoading && <p className="mt-6 text-sm text-[var(--muted-foreground)]">{t('study.loading')}</p>}
      {curriculum.isError && <p role="alert" className="mt-6 text-sm text-red-700 dark:text-red-300">{t('study.error')}</p>}
      {solutionError && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{t('study.error')}</p>}
      {audio.error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{t('study.speechError')}</p>}

      {!curriculum.isLoading && curriculum.data && curriculum.data.units.length === 0 && (
        <div className="surface-panel mt-6 p-5" role="status">
          <p className="font-bold">{t('study.unavailable')}</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t('study.free')}</p>
        </div>
      )}

      {curriculum.data && !selectedUnit && curriculum.data.units.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {curriculum.data.units.map((unit) => (
            <article key={unit.id} data-unit-id={unit.id} className="surface-panel p-5">
              <p className="text-xs font-bold text-[var(--accent)]">{t('study.sections.' + unit.section)} · {t('study.grade', { level: unit.target_grade })}</p>
              <h3 className="mt-2 text-xl font-black">{language === 'ko' ? unit.title_ko : language === 'ja' ? unit.title_ja : unit.title_en}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{unit.items.length} · {t('study.learn')}</p>
              <button type="button" onClick={() => { setSelectedUnitId(unit.id); setItemIndex(0); }} className="mt-5 touch-target rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white">
                {t('study.learn')}
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedUnit && (
        <div className="mt-6">
          <button type="button" onClick={() => {audio.stop();setSelectedUnitId(null);}} className="min-h-11 px-3 text-sm font-bold text-[var(--accent)]">← {t('study.learn')}</button>
          <h3 className="mt-3 text-xl font-black">{language === 'ko' ? selectedUnit.title_ko : language === 'ja' ? selectedUnit.title_ja : selectedUnit.title_en}</h3>
          <div className="mt-4 grid gap-4">
            {selectedUnit.items.slice(itemIndex, itemIndex + 1).map((item) => {
              const index = itemIndex;
              const selected = answers[item.id];
              const solution = solutions[item.id];
              const completed = item.progress_status === 'completed' || completedItems.has(item.id);
              const answerIndex = typeof solution?.answer_payload.answer_index === 'number' ? solution.answer_payload.answer_index : null;
              return (
                <article key={item.id} data-item-id={item.id} className="surface-panel p-5 sm:p-6">
                  <p className="text-xs font-bold text-[var(--muted-foreground)]">{index + 1} · {t('study.sections.' + item.item_type)}</p>
                  <h4 className="mt-3 text-lg font-black leading-8">{localized(item, language)}</h4>
                  {item.audio?.kind === 'google' ? (
                    <button type="button" onClick={() => void audio.play(item.audio!, { contentType: 'topik_owner_item', contentId: item.id, levelTag: String(item.target_grade), section: selectedUnit.section })} className="mt-4 touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white"><Volume2 aria-hidden="true" size={18} />{t('study.play')}</button>
                  ) : item.audio?.kind === 'unavailable' ? (
                    <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Headphones aria-hidden="true" size={17} />{t('quiz.audioPending')}</p>
                  ) : null}
                  {item.choices.length > 0 && <fieldset className="mt-5 grid gap-2"><legend className="sr-only">{t('study.answer')}</legend>{item.choices.map((choice, choiceIndex) => <button key={choice} type="button" role="radio" aria-checked={selected === choiceIndex} onClick={() => setAnswers((current) => ({ ...current, [item.id]: choiceIndex }))} className={`touch-target rounded-[var(--radius-md)] border px-4 py-3 text-left font-semibold ${selected === choiceIndex ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]'}`}><span className="mr-3 text-xs text-[var(--muted-foreground)]">{choiceIndex + 1}</span>{choice}</button>)}</fieldset>}
                  {!solution && <button type="button" disabled={item.choices.length > 0 && selected === undefined} onClick={() => void revealSolution(item.id)} className="mt-5 touch-target rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-bold disabled:opacity-40">{t('study.solution')}</button>}
                  {solution && <div className="mt-5 border-t border-[var(--border)] pt-4 text-sm leading-6"><p className="font-bold text-[var(--accent)]">{t('study.solution')}</p>{answerIndex !== null && <p className="mt-2">{t('study.answer')}: {item.choices[answerIndex] ?? String(answerIndex + 1)}</p>}<p className="mt-2 text-[var(--muted-foreground)]">{solutionText(solution, language)}</p><p className="mt-3 text-xs font-bold text-[var(--success)]">{t(completed ? 'study.learned' : 'study.revealOnly')}</p></div>}
                  {solution && !completed && <button disabled={completing} type="button" onClick={() => void completeItem(item.id)} className="touch-target mt-4 rounded-xl bg-[var(--accent)] px-4 font-bold text-white">{t('study.completeAction')}</button>}
                  {itemIndex > 0 && <button type="button" onClick={() => { audio.stop(); setItemIndex(i => i - 1); }} className="touch-target mt-4 mr-3 rounded-xl border px-4">{t('study.previous')}</button>}
                  {itemIndex + 1 < selectedUnit.items.length && <button type="button" onClick={() => { audio.stop(); setItemIndex(i => i + 1); }} className="touch-target mt-4 rounded-xl border px-4">{t('study.next')}</button>}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
