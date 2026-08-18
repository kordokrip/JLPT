import { useTranslation } from 'react-i18next';
import { PronunciationButton } from '../../components/feature/PronunciationButton';
import { CHARACTER_STAGES, kanjiRules, stageText } from './data';
import { getCardAudioText, getKanaPronunciationExample } from './logic';
import type { CharacterMode, CharacterStage, JlptLevel, StudyCard } from './types';
import { DrawingPracticePad } from './DrawingPracticePad';

type CharacterTrainerViewProps = {
  mode: CharacterMode;
  level: JlptLevel;
  levels: readonly JlptLevel[];
  index: number;
  stage: CharacterStage;
  revealed: boolean;
  answer: string | null;
  deck: StudyCard[];
  card: StudyCard | undefined;
  progress: number;
  choices: string[];
  expected: string | undefined;
  correct: boolean;
  onMode: (mode: CharacterMode) => void;
  onLevel: (level: JlptLevel) => void;
  onReveal: (revealed: boolean) => void;
  onAnswer: (answer: string | null) => void;
  onStage: (stage: CharacterStage) => void;
  onNext: () => void;
  onComplete: (ok: boolean) => void;
};

export function CharacterTrainerView(props: CharacterTrainerViewProps) {
  const {
    mode,
    level,
    levels,
    index,
    stage,
    revealed,
    answer,
    deck,
    card,
    progress,
    choices,
    expected,
    correct,
    onMode,
    onLevel,
    onReveal,
    onAnswer,
    onStage,
    onNext,
    onComplete,
  } = props;

  if (!card) {
    return (
      <div className="mx-auto max-w-[920px] px-5 py-8 pb-28">
        <CharacterTrainerHeader />
        <ModeControls mode={mode} level={level} levels={levels} onMode={onMode} onLevel={onLevel} />
        <div className="surface-panel mt-6 p-8 text-center text-sm text-[var(--muted-foreground)]">
          한자 데이터를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 pb-28 sm:px-6 lg:px-10">
      <CharacterTrainerHeader />
      <ModeControls mode={mode} level={level} levels={levels} onMode={onMode} onLevel={onLevel} />

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="surface-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">
                {stageText[stage].title}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-foreground">
                {stageText[stage].desc}
              </h1>
            </div>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
              {index + 1} / {deck.length}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
            <CharacterPreview card={card} stage={stage} revealed={revealed} progress={progress} />
            <section className="space-y-4">
              <StagePanel
                card={card}
                stage={stage}
                revealed={revealed}
                answer={answer}
                choices={choices}
                expected={expected}
                correct={correct}
                onReveal={onReveal}
                onAnswer={onAnswer}
              />
              <StageControls stage={stage} onStage={onStage} />
              <CompletionControls
                stage={stage}
                answer={answer}
                onComplete={onComplete}
                onNext={onNext}
              />
            </section>
          </div>
        </main>
        <RoutineSidebar />
      </div>
    </div>
  );
}

function CharacterTrainerHeader() {
  return (
    <header className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--accent)]">Moji Trainer</p>
      <h1 className="font-serif-jp text-[40px] font-normal leading-tight text-foreground">
        문자 암기
      </h1>
      <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--muted-foreground)]">
        히라가나, 가타카나, 공개된 JLPT 한자를 한 글자씩 보고, 가리고, 쓰고, 테스트하는 장기기억 루프입니다.
      </p>
    </header>
  );
}

function ModeControls({
  mode,
  level,
  levels,
  onMode,
  onLevel,
}: {
  mode: CharacterMode;
  level: JlptLevel;
  levels: readonly JlptLevel[];
  onMode: (mode: CharacterMode) => void;
  onLevel: (level: JlptLevel) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="surface-card flex flex-col gap-3 p-3 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 overflow-x-auto">
        {(['hiragana', 'katakana', 'kanji'] as CharacterMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onMode(item)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${
              mode === item ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'
            }`}
          >
            {item === 'hiragana' ? '히라가나' : item === 'katakana' ? '가타카나' : '한자'}
          </button>
        ))}
      </div>
      {mode === 'kanji' && (
        <div className="flex gap-2">
          {levels.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onLevel(item)}
              className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                level === item ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'border border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              {t(`levels.${item}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterPreview({
  card,
  stage,
  revealed,
  progress,
}: {
  card: StudyCard;
  stage: CharacterStage;
  revealed: boolean;
  progress: number;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-center">
      <div className="mx-auto flex aspect-square max-w-[240px] items-center justify-center rounded-xl bg-[var(--card)] shadow-inner">
        <span className="font-serif-jp text-[112px] leading-none text-foreground">
          {(stage === 'recall' || stage === 'writeQuiz') && !revealed ? '?' : card.char}
        </span>
      </div>
      <div className="mt-3 flex justify-center">
        <PronunciationButton
          text={getCardAudioText(card)}
          surface={card.mode === 'kanji' ? 'kanji' : 'kana'}
          label={`${card.char} 발음 듣기`}
          className="bg-[var(--card)]"
          slow
          repeat={1}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Metric label="진도" value={`${progress}/5`} />
        <Metric label="획수" value={card.strokeCount ? `${card.strokeCount}` : '-'} />
        <Metric label="분류" value={card.mode === 'kanji' ? card.level : card.meaning} />
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
  onReveal,
  onAnswer,
}: {
  card: StudyCard;
  stage: CharacterStage;
  revealed: boolean;
  answer: string | null;
  choices: string[];
  expected: string | undefined;
  correct: boolean;
  onReveal: (revealed: boolean) => void;
  onAnswer: (answer: string | null) => void;
}) {
  if (stage === 'observe') return <InfoPanel card={card} />;

  if (stage === 'recall') {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4">
        <p className="mb-3 text-sm text-[var(--muted-foreground)]">
          글자를 가린 상태에서 먼저 소리 내어 말하세요. 답은 마지막에 확인합니다.
        </p>
        <button
          type="button"
          onClick={() => onReveal(true)}
          className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white"
        >
          답 확인
        </button>
        {revealed && <InfoPanel card={card} compact />}
      </div>
    );
  }

  if (stage === 'write') {
    return (
      <div className="space-y-4">
        <StrokeRules card={card} />
        <DrawingPracticePad card={card} />
      </div>
    );
  }

  if (stage === 'writeQuiz') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm font-semibold text-foreground">
            {card.mode === 'kanji'
              ? `${card.reading} / ${card.meaning}`
              : `${card.reading} 소리가 나는 문자를 손으로 쓰세요.`}
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            정답을 보기 전에 먼저 크게 쓰고 채점하세요.
          </p>
          <button
            type="button"
            onClick={() => onReveal(true)}
            className="mt-3 min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold"
          >
            정답 보기
          </button>
        </div>
        <DrawingPracticePad card={card} quiz />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">
        {card.mode === 'kanji' ? '이 한자의 뜻은 무엇입니까?' : '이 문자의 발음은 무엇입니까?'}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onAnswer(choice)}
            className={[
              'min-h-12 rounded-lg border px-3 text-left text-sm transition-colors',
              answer === choice
                ? choice === expected
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-red-500 bg-red-50 text-red-700'
                : 'border-[var(--border)] hover:border-[var(--accent)]',
            ].join(' ')}
          >
            {choice}
          </button>
        ))}
      </div>
      {answer !== null && (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {correct ? '정답입니다. 다음 간격으로 보냅니다.' : `오답입니다. 정답: ${expected}`}
        </p>
      )}
    </div>
  );
}

function StageControls({
  stage,
  onStage,
}: {
  stage: CharacterStage;
  onStage: (stage: CharacterStage) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHARACTER_STAGES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onStage(item)}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
            stage === item ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'
          }`}
        >
          {stageText[item].title}
        </button>
      ))}
    </div>
  );
}

function CompletionControls({
  stage,
  answer,
  onComplete,
  onNext,
}: {
  stage: CharacterStage;
  answer: string | null;
  onComplete: (ok: boolean) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex gap-2">
      {stage === 'quiz' && answer !== null ? (
        <>
          <button type="button" onClick={() => onComplete(false)} className="min-h-11 flex-1 rounded-lg border border-[var(--border)] text-sm font-semibold">
            다시 학습
          </button>
          <button type="button" onClick={() => onComplete(true)} className="min-h-11 flex-1 rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
            기억됨
          </button>
        </>
      ) : (
        <button type="button" onClick={onNext} className="min-h-11 w-full rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
          다음 문자
        </button>
      )}
    </div>
  );
}

function RoutineSidebar() {
  return (
    <aside className="space-y-4">
      <div className="surface-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">뇌새김 루틴</h2>
        <ol className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <li>1. 모양을 보고 의미 이미지를 만든다.</li>
          <li>2. 글자를 가리고 읽기/뜻을 인출한다.</li>
          <li>3. 획순 규칙을 말하면서 손으로 쓴다.</li>
          <li>4. 즉시 테스트하고 다음 문자와 섞어 복습한다.</li>
        </ol>
      </div>
      <div className="surface-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">오늘의 원칙</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          초보자는 한 번에 읽기, 뜻, 모든 어휘를 외우기보다 글자 하나의 모양-소리-의미 연결을 먼저 고정해야 합니다.
          5분 뒤 다시 같은 글자를 꺼내 쓰면 기억 강도가 올라갑니다.
        </p>
      </div>
    </aside>
  );
}

function InfoPanel({ card, compact = false }: { card: StudyCard; compact?: boolean }) {
  const example = getKanaPronunciationExample(card);
  return (
    <div className={`rounded-xl border border-[var(--border)] ${compact ? 'mt-4 p-3' : 'p-4'}`}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Info label="읽기" value={card.reading} />
        <Info label="의미" value={card.meaning} />
        {example && (
          <Info
            label="발음 단어"
            value={`${card.char} → ${example.word} (${example.meaning})`}
            wide
          />
        )}
        <Info label="암기 힌트" value={card.hint} wide />
      </dl>
      <div className="mt-4">
        <PronunciationButton
          compact={compact}
          text={getCardAudioText(card)}
          surface={card.mode === 'kanji' ? 'kanji' : 'kana'}
          label={`${card.char} 발음 듣기`}
          slow
          repeat={1}
        />
      </div>
    </div>
  );
}

function StrokeRules({ card }: { card: StudyCard }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <h2 className="mb-2 text-sm font-semibold text-foreground">쓰기 순서 힌트</h2>
      <p className="mb-3 text-sm text-[var(--muted-foreground)]">
        {card.mode === 'kanji'
          ? `이 한자는 ${card.strokeCount || '?'}획입니다. 정확한 개별 획순 데이터는 아직 없으므로 아래 일반 규칙으로 크게 써 보세요.`
          : `${card.char}는 ${card.strokeCount}획입니다. 획마다 발음 ${card.reading}를 짧게 말하면서 쓰세요.`}
      </p>
      <ul className="grid gap-2 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
        {(card.mode === 'kanji' ? kanjiRules : ['첫 획 방향을 먼저 말하기', '획 사이를 끊어 쓰기', '마지막에 전체 모양을 다시 보기']).map((rule) => (
          <li key={rule} className="rounded-lg bg-[var(--surface-alt)] px-3 py-2">{rule}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-alt)] px-2 py-2">
      <div className="text-[10px] text-[var(--muted-foreground)]">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-foreground">{value}</dd>
    </div>
  );
}
