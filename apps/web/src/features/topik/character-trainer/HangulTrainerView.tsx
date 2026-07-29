import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InstructionLanguage } from '@nihongo-n3/shared';
import { DrawingPracticePad } from '../../character-trainer/DrawingPracticePad';
import type { CharacterStage } from '../../character-trainer/types';
import { useKoreanAudio } from '../useKoreanAudio';
import { HANGUL_MODE_ORDER, HANGUL_STAGE_TITLES, labelFor } from './data';
import type { HangulCard, HangulTrainerMode } from './types';
import type { useHangulTrainer } from './useHangulTrainer';
import { useSettingsStore } from '../../../stores/settings-store';

type HangulTrainerModel = ReturnType<typeof useHangulTrainer>;

export function HangulTrainerView({ trainer }: { trainer: HangulTrainerModel }) {
  const { t } = useTranslation();
  const instructionLanguage = useSettingsStore((state) => state.instructionLanguages['topik-ko']) as InstructionLanguage;
  const audio = useKoreanAudio();
  const stageCopy = HANGUL_STAGE_TITLES[instructionLanguage][trainer.stage]
    ?? HANGUL_STAGE_TITLES.en[trainer.stage]!;

  if (!trainer.card) return null;

  const card = trainer.card;
  return (
    <div className="app-page max-w-[1040px] pb-28">
      <header className="mb-5 max-w-[760px]">
        <p className="text-sm font-bold text-[var(--accent)]">{t('topik.characters.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{t('topik.characters.title')}</h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.characters.description')}</p>
      </header>

      <ModeControls mode={trainer.mode} onMode={trainer.switchMode} />

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="surface-card p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[var(--accent)]">{stageCopy.title}</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{stageCopy.description}</h2>
            </div>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
              {trainer.index + 1} / {trainer.deck.length}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
            <CharacterPreview
              card={card}
              stage={trainer.stage}
              revealed={trainer.revealed}
              progress={trainer.progress}
              onPlay={() => audio.speakText(card.exampleWord)}
              isPlaying={audio.playing}
              label={t('topik.characters.playExample', { word: card.exampleWord })}
              instructionLanguage={instructionLanguage}
            />
            <section className="space-y-4">
              <StagePanel
                card={card}
                stage={trainer.stage}
                revealed={trainer.revealed}
                answer={trainer.answer}
                choices={trainer.choices}
                expected={trainer.expected}
                correct={trainer.correct}
                instructionLanguage={instructionLanguage}
                onReveal={trainer.setRevealed}
                onAnswer={trainer.setAnswer}
              />
              <StageControls
                stage={trainer.stage}
                instructionLanguage={instructionLanguage}
                onStage={trainer.switchStage}
              />
              <CompletionControls stage={trainer.stage} answer={trainer.answer} onNext={trainer.nextCard} onComplete={trainer.complete} />
              {audio.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t(`topik.characters.audio.${audio.error}`)}</p>}
            </section>
          </div>
        </main>
        <RoutineSidebar />
      </div>
    </div>
  );
}

function ModeControls({ mode, onMode }: { mode: HangulTrainerMode; onMode: (mode: HangulTrainerMode) => void }) {
  const { t } = useTranslation();
  return (
    <div className="surface-card flex gap-2 overflow-x-auto p-3 shadow-none" role="tablist" aria-label={t('topik.characters.modeLabel')}>
      {HANGUL_MODE_ORDER.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={mode === item}
          onClick={() => onMode(item)}
          className={`touch-target shrink-0 rounded-[var(--radius-md)] px-4 text-sm font-bold ${mode === item ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'}`}
        >
          {t(`topik.characters.modes.${item}`)}
        </button>
      ))}
    </div>
  );
}

function CharacterPreview({
  card,
  stage,
  revealed,
  progress,
  onPlay,
  isPlaying,
  label,
  instructionLanguage,
}: {
  card: HangulCard;
  stage: CharacterStage;
  revealed: boolean;
  progress: number;
  onPlay: () => void;
  isPlaying: boolean;
  label: string;
  instructionLanguage: InstructionLanguage;
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-center">
      <div className="mx-auto flex aspect-square max-w-[240px] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--card)] shadow-inner">
        <span lang="ko" className="text-[112px] font-bold leading-none text-foreground">
          {(stage === 'recall' || stage === 'writeQuiz') && !revealed ? '?' : card.char}
        </span>
      </div>
      <button type="button" onClick={onPlay} aria-label={label} className="touch-target mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold text-[var(--accent)] hover:border-[var(--accent)]">
        <Volume2 aria-hidden="true" size={18} />
        {isPlaying ? t('topik.characters.playing') : t('topik.characters.play')}
      </button>
      <p lang="ko" className="mt-2 text-xs text-[var(--muted-foreground)]">{card.exampleWord} · {labelFor(card.exampleGloss, instructionLanguage)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Metric label={t('topik.characters.progress')} value={`${progress}/5`} />
        <Metric label={t('topik.characters.strokes')} value={String(card.strokeCount)} />
        <Metric label={t('topik.characters.category')} value={t(`topik.characters.modes.${card.mode}`)} />
      </div>
    </section>
  );
}

function StagePanel({
  card,
  stage,
  revealed,
  answer,
  choices,
  expected,
  correct,
  instructionLanguage,
  onReveal,
  onAnswer,
}: {
  card: HangulCard;
  stage: CharacterStage;
  revealed: boolean;
  answer: string | null;
  choices: string[];
  expected: string | undefined;
  correct: boolean;
  instructionLanguage: InstructionLanguage;
  onReveal: (revealed: boolean) => void;
  onAnswer: (answer: string | null) => void;
}) {
  const { t } = useTranslation();
  if (stage === 'observe') return <InfoPanel card={card} instructionLanguage={instructionLanguage} />;

  if (stage === 'recall') {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.characters.recallPrompt')}</p>
        <button type="button" onClick={() => onReveal(true)} className="touch-target mt-3 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-bold text-white">{t('topik.characters.reveal')}</button>
        {revealed && <InfoPanel card={card} compact instructionLanguage={instructionLanguage} />}
      </div>
    );
  }

  if (stage === 'write') {
    return (
      <div className="space-y-4">
        <StrokeHint card={card} />
        <DrawingPracticePad card={{ ...card, reading: card.romanization, meaning: card.exampleWord }} canvasLabel={t('topik.characters.canvasLabel')} />
      </div>
    );
  }

  if (stage === 'writeQuiz') {
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
          <p className="text-sm font-bold text-foreground">{t('topik.characters.writeQuizPrompt', { romanization: card.romanization })}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.characters.writeQuizDescription')}</p>
          <button type="button" onClick={() => onReveal(true)} className="touch-target mt-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-bold">{t('topik.characters.showAnswer')}</button>
          {revealed && <p lang="ko" className="mt-3 text-4xl font-bold">{card.char}</p>}
        </div>
        <DrawingPracticePad
          card={{ ...card, reading: card.romanization, meaning: card.exampleWord }}
          quiz
          quizPrompt={t('topik.characters.writeQuizPrompt', { romanization: card.romanization })}
          canvasLabel={t('topik.characters.canvasLabel')}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
      <p className="mb-3 text-sm font-bold text-foreground">{t('topik.characters.quizPrompt')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onAnswer(choice)}
            className={`touch-target rounded-[var(--radius-md)] border px-3 text-left text-sm font-bold transition-colors ${
              answer === choice
                ? choice === expected ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                : 'border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
      {answer !== null && <p className="mt-3 text-sm text-[var(--muted-foreground)]">{correct ? t('topik.characters.correct') : t('topik.characters.wrong', { answer: expected })}</p>}
    </div>
  );
}

function InfoPanel({ card, compact = false, instructionLanguage }: { card: HangulCard; compact?: boolean; instructionLanguage: InstructionLanguage }) {
  const { t } = useTranslation();
  const label = labelFor(card.exampleGloss, instructionLanguage);
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--border)] ${compact ? 'mt-4 p-3' : 'p-4'}`}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Info label={t('topik.characters.romanization')} value={card.romanization} />
        <Info label={t('topik.characters.strokes')} value={String(card.strokeCount)} />
        <Info label={t('topik.characters.anchorWord')} value={`${card.exampleWord} · ${label}`} wide />
        <Info label={t('topik.characters.composition')} value={card.composition} wide />
        <Info label={t('topik.characters.memoryHint')} value={t('topik.characters.memoryHintValue', { word: card.exampleWord, romanization: card.romanization })} wide />
      </dl>
    </div>
  );
}

function StrokeHint({ card }: { card: HangulCard }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
      <h3 className="text-sm font-bold">{t('topik.characters.strokeHintTitle')}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.characters.strokeHintDescription', { strokes: card.strokeCount, composition: card.composition })}</p>
      <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('topik.characters.handwritingNote')}</p>
    </div>
  );
}

function StageControls({ stage, instructionLanguage, onStage }: { stage: CharacterStage; instructionLanguage: InstructionLanguage; onStage: (stage: CharacterStage) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(HANGUL_STAGE_TITLES[instructionLanguage]) as CharacterStage[]).map((item) => (
        <button key={item} type="button" onClick={() => onStage(item)} className={`touch-target rounded-[var(--radius-md)] px-3 text-sm font-bold ${stage === item ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'}`}>
          {HANGUL_STAGE_TITLES[instructionLanguage][item]?.title ?? HANGUL_STAGE_TITLES.en[item]!.title}
        </button>
      ))}
    </div>
  );
}

function CompletionControls({ stage, answer, onNext, onComplete }: { stage: CharacterStage; answer: string | null; onNext: () => void; onComplete: (ok: boolean) => void }) {
  const { t } = useTranslation();
  if (stage === 'quiz' && answer !== null) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={() => onComplete(false)} className="touch-target flex-1 rounded-[var(--radius-md)] border border-[var(--border)] text-sm font-bold">{t('topik.characters.relearn')}</button>
        <button type="button" onClick={() => onComplete(true)} className="touch-target flex-1 rounded-[var(--radius-md)] bg-[var(--accent)] text-sm font-bold text-white">{t('topik.characters.remembered')}</button>
      </div>
    );
  }
  return <button type="button" onClick={onNext} className="touch-target w-full rounded-[var(--radius-md)] bg-[var(--accent)] text-sm font-bold text-white">{t('topik.characters.next')}</button>;
}

function RoutineSidebar() {
  const { t } = useTranslation();
  return (
    <aside className="space-y-4">
      <div className="surface-card p-4">
        <h2 className="text-sm font-bold">{t('topik.characters.routineTitle')}</h2>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
          {[1, 2, 3, 4].map((item) => <li key={item}>{t(`topik.characters.routine.${item}`)}</li>)}
        </ol>
      </div>
      <div className="surface-card p-4">
        <h2 className="text-sm font-bold">{t('topik.characters.audioTitle')}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.characters.audioDescription')}</p>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-2 py-2"><div className="text-[10px] text-[var(--muted-foreground)]">{label}</div><div className="mt-1 text-sm font-bold text-foreground">{value}</div></div>;
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="text-xs text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 text-sm font-bold leading-6 text-foreground">{value}</dd></div>;
}
