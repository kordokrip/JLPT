import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import type { CharacterStage } from './types';
import { DrawingPracticePad } from './DrawingPracticePad';
import { useCharacterCopy } from './character-copy';
import './character-trainer.css';

export type Letter = {
  id: string; char: string; reading: string; meaning?: string | undefined; example?: string | undefined;
  composition?: string | undefined; strokeCount: number;
};
export type LessonModel = {
  index: number; stage: CharacterStage; revealed: boolean; answer: string | null;
  progress: number; choices: string[]; expected?: string | undefined; correct: boolean;
  onStage: (stage: CharacterStage) => void; onReveal: (value: boolean) => void;
  onAnswer: (answer: string | null) => void; onSelect: (index: number) => void;
  onComplete: (correct: boolean) => void;
};
const lookalikes = ['あお', 'ぬめ', 'ねれわ', 'はほ', 'るろ', 'シツ', 'ソン', 'クケ', '日目', '土士', '人入', 'ㄱㅋ', 'ㄷㅌ', 'ㅂㅍ', 'ㅈㅊ', 'ㅏㅓ', 'ㅗㅜ', '가카', '다타', '바파', '자차'];

/** 강성호 · 2026-10-25: 가용 폭 기반 공통 문자 수업. FSRS·XP 기록과 분리. */
export function CharacterLesson({ letters, model, controls, audio, language, loading, error, onReload }: {
  letters: Letter[]; model: LessonModel; controls: ReactNode;
  audio: (hidden: boolean) => ReactNode; language: 'ja' | 'ko';
  loading?: boolean | undefined; error?: boolean | undefined; onReload?: (() => void) | undefined;
}) {
  const c = useCharacterCopy();
  const [group, setGroup] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [retryResults, setRetryResults] = useState<Record<string, boolean>>({});
  const [queue, setQueue] = useState<number[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const groupStart = group * 5;
  const indices = Array.from({ length: Math.min(5, Math.max(0, letters.length - groupStart)) }, (_, i) => groupStart + i);
  const card = letters[model.index];
  const retrying = queue !== null;
  const chooseGroup = (value: number) => {
    setGroup(value); setResults({}); setRetryResults({}); setQueue(null); setFinished(false); setSaveError(false);
    model.onSelect(value * 5);
  };
  const advance = () => {
    if (!card || model.answer === null) return;
    const ok = model.correct;
    try { model.onComplete(ok); setSaveError(false); }
    catch { setSaveError(true); return; }
    if (retrying) {
      setRetryResults(old => ({ ...old, [card.id]: ok }));
      const remaining = queue!.slice(1);
      setQueue(remaining);
      if (remaining.length) { model.onSelect(remaining[0]!); model.onStage('quiz'); }
      else setFinished(true);
    } else {
      const next = { ...results, [card.id]: ok };
      setResults(next);
      const pending = indices.find(i => next[letters[i]!.id] === undefined);
      if (pending !== undefined) model.onSelect(pending);
      else setFinished(true);
    }
  };
  const startRetry = () => {
    const missed = indices.filter(i => results[letters[i]!.id] === false);
    if (!missed.length) return;
    setQueue(missed); setRetryResults({}); setFinished(false); model.onSelect(missed[0]!); model.onStage('quiz');
  };
  const hidden = (model.stage === 'recall' || model.stage === 'writeQuiz') && !model.revealed;
  const informational = model.stage === 'observe' || model.stage === 'write' || model.revealed;
  const similar = card && lookalikes.find(set => set.includes(card.char));
  const comparisons = similar ? letters.filter(item => item.id !== card?.id && similar.includes(item.char)) : [];
  return <div className="app-page character-page">
    <header className="character-header">
      <p className="text-sm font-bold text-[var(--accent)]">{language === 'ja' ? 'JLPT · あ ア 漢' : 'TOPIK · 가 나 다'}</p>
      <h1>{c.title}</h1><p>{c.subtitle}</p>
    </header>
    {controls}
    {loading || error || !card ? <section className="surface-card p-6" role={error ? 'alert' : 'status'}>
      <p>{loading ? c.loading : error ? c.error : c.empty}</p>
      {error && <Button className="mt-4" onClick={onReload}>{c.reload}</Button>}
    </section> : <>
      <section className="surface-card p-4 mb-5" aria-label={c.group}>
        <button type="button" className="min-h-12 font-bold text-left w-full" aria-expanded={showPicker} onClick={() => setShowPicker(!showPicker)}>{c.group} {group + 1} · {indices.map(i => letters[i]!.char).join(' ')} <span aria-hidden="true">{showPicker ? '−' : '+'}</span></button>
        {showPicker && <><label className="sr-only" htmlFor="character-group">{c.group}</label>
          <select id="character-group" className="character-group" value={group} onChange={event => chooseGroup(Number(event.target.value))}>
            {Array.from({ length: Math.ceil(letters.length / 5) }, (_, i) => <option key={i} value={i}>{i + 1}. {letters.slice(i * 5, i * 5 + 5).map(item => item.char).join(' · ')}</option>)}
          </select><p className="mt-2 text-sm text-[var(--muted-foreground)]">{c.groupHint}</p></>}
      </section>
      {finished ? <section className="surface-card character-lesson" aria-live="polite">
        <h2 className="text-2xl font-bold">{c.done}</h2>
        <dl className="grid grid-cols-2 gap-4 my-5">
          <div><dt>{c.first}</dt><dd className="text-3xl font-bold">{Object.values(results).filter(Boolean).length} / {Object.keys(results).length}</dd></div>
          {Object.keys(retryResults).length > 0 && <div><dt>{c.retry}</dt><dd className="text-3xl font-bold">{Object.values(retryResults).filter(Boolean).length} / {Object.keys(retryResults).length}</dd></div>}
        </dl>
        <p>{Object.values(results).every(Boolean) ? c.allDone : c.wrong}</p>
        <div className="character-actions">
          {Object.values(results).some(ok => !ok) && <Button onClick={startRetry}>{c.retryAction}</Button>}
          <Button variant="outline" onClick={() => chooseGroup(group)}>{c.restart}</Button>
          {groupStart + 5 < letters.length && <Button variant="outline" onClick={() => chooseGroup(group + 1)}>{c.choose}</Button>}
        </div>
      </section> : <div className="character-workspace">
        <section className="surface-card character-lesson">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div><p className="text-sm font-bold text-[var(--accent)]">{retrying ? c.retry : c.stages[model.stage]}</p><h2 className="text-xl font-bold mt-1">{c[model.stage]}</h2></div>
            <span className="text-sm text-[var(--muted-foreground)]">{retrying ? c.retry : `${Math.min(Object.keys(results).length + 1, indices.length)} / ${indices.length}`}</span>
          </div>
          <nav className="character-stage-nav" aria-label={c.routine}>
            {(['observe', 'recall', 'write', 'writeQuiz', 'quiz'] as CharacterStage[]).map(stage => <Button key={stage} variant="outline" disabled={model.answer !== null} aria-pressed={stage === model.stage} onClick={() => model.onStage(stage)}>{c.stages[stage]}</Button>)}
          </nav>
          <div className="character-exercise">
            <section className="text-center">
              <div className="character-glyph"><span lang={language} className={language === 'ja' ? 'font-serif-jp' : 'font-bold'}>{hidden ? '?' : card.char}</span></div>
              <div className="flex justify-center mt-3">{audio(hidden)}</div>
              {hidden && <p className="mt-4 text-xl font-bold">{card.reading}{card.meaning ? ` · ${card.meaning}` : ''}</p>}
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">{c.progress} {model.progress}/5 · {card.strokeCount} {c.strokes}</p>
            </section>
            <section className="space-y-4 character-detail">
              {informational && <dl className="character-info">
                <div><dt>{c.reading}</dt><dd>{card.reading}</dd></div>
                {card.meaning && <div><dt>{c.meaning}</dt><dd>{card.meaning}</dd></div>}
                {card.example && <div className="character-info-wide"><dt>{c.example}</dt><dd>{card.example}</dd></div>}
                {card.composition && <div className="character-info-wide"><dt>{c.composition}</dt><dd lang={language}>{card.composition} = {card.char}</dd></div>}
              </dl>}
              {(model.stage === 'recall' || model.stage === 'writeQuiz') && !model.revealed && <Button variant="outline" onClick={() => model.onReveal(true)}>{c.reveal}</Button>}
              {(model.stage === 'write' || model.stage === 'writeQuiz') && <DrawingPracticePad key={`${card.id}:${model.stage}`} card={{ ...card, meaning: card.meaning ?? '' }} quiz={model.stage === 'writeQuiz'} quizPrompt={card.reading} canvasLabel={c.canvas} />}
              {model.stage === 'observe' && <>
                <div className="character-feedback"><h3 className="font-bold">{c.hint}</h3><p>{c.hintBody}</p></div>
                {comparisons.length > 0 && <div><h3 className="font-bold">{c.compare}</h3><div className="character-row">{[card, ...comparisons].map(item => <span key={item.id} className="surface-panel p-3 text-center"><span lang={language} className="text-3xl block">{item.char}</span><span className="text-sm">{item.reading}</span></span>)}</div><p className="text-sm text-[var(--muted-foreground)]">{c.compareBody}</p></div>}
              </>}
              {model.stage === 'quiz' && <>
                <div className="character-choices">{model.choices.map(choice => <Button key={choice} variant="outline" aria-pressed={model.answer === choice} disabled={model.answer !== null} onClick={() => model.onAnswer(choice)}>{choice}</Button>)}</div>
                {model.answer !== null && <div className="character-feedback" role="status"><strong>{model.correct ? c.correct : c.wrong}</strong><p>{c.answer}: {model.expected}</p></div>}
              </>}
              <div className="character-actions">
                {model.stage === 'observe' && <Button onClick={() => model.onStage('recall')}>{c.nextStage}</Button>}
                {model.stage !== 'observe' && model.stage !== 'quiz' && <Button onClick={() => model.onStage('quiz')}>{c.test}</Button>}
                {model.stage === 'quiz' && <Button disabled={model.answer === null} onClick={advance}>{Object.keys(results).length >= indices.length - 1 || retrying && queue!.length === 1 ? c.finish : c.next}</Button>}
              </div>
              {saveError && <p role="alert" className="character-feedback">{c.storageError}</p>}
            </section>
          </div>
        </section>
        <aside><details className="surface-card character-reference"><summary>{c.routine}</summary><p>{c.routineBody}</p><p className="mt-3">{c.latinNote}</p></details></aside>
      </div>}
    </>}
    <p className="mt-5 text-sm leading-6 text-[var(--muted-foreground)]">{c.local}</p>
  </div>;
}
