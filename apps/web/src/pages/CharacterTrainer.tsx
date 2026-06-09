import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PronunciationButton } from '../components/feature/PronunciationButton';
import { kanjiApi } from '../lib/api';
import type { KanjiItem } from '../lib/db';
import type { PointerEvent } from 'react';

type Mode = 'hiragana' | 'katakana' | 'kanji';
type Stage = 'observe' | 'recall' | 'write' | 'quiz';
type JlptLevel = 'N5' | 'N4' | 'N3';

export type KanaCard = {
  id: string;
  mode: 'hiragana' | 'katakana';
  char: string;
  reading: string;
  meaning: string;
  strokeCount: number;
  hint: string;
  audioPath?: string;
};

export type StudyCard = KanaCard | {
  id: string;
  mode: 'kanji';
  char: string;
  reading: string;
  meaning: string;
  strokeCount: number;
  hint: string;
  audioPath?: string;
  level: JlptLevel;
};

const HIRAGANA: KanaCard[] = [
  ['あ','a',3],['い','i',2],['う','u',2],['え','e',2],['お','o',3],
  ['か','ka',3],['き','ki',4],['く','ku',1],['け','ke',3],['こ','ko',2],
  ['さ','sa',3],['し','shi',1],['す','su',2],['せ','se',3],['そ','so',1],
  ['た','ta',4],['ち','chi',2],['つ','tsu',1],['て','te',1],['と','to',2],
  ['な','na',4],['に','ni',3],['ぬ','nu',2],['ね','ne',2],['の','no',1],
  ['は','ha',3],['ひ','hi',1],['ふ','fu',4],['へ','he',1],['ほ','ho',4],
  ['ま','ma',3],['み','mi',2],['む','mu',3],['め','me',2],['も','mo',3],
  ['や','ya',3],['ゆ','yu',2],['よ','yo',2],
  ['ら','ra',2],['り','ri',2],['る','ru',1],['れ','re',2],['ろ','ro',1],
  ['わ','wa',2],['を','wo',3],['ん','n',1],
].map(([char, reading, strokeCount]) => ({
  id: `h-${char}`,
  mode: 'hiragana',
  char: String(char),
  reading: String(reading),
  meaning: '히라가나',
  strokeCount: Number(strokeCount),
  hint: '둥근 흐름을 유지하며 크게 쓰고, 마지막 획에서 소리와 모양을 함께 말하세요.',
}));

const KATAKANA: KanaCard[] = [
  ['ア','a',2],['イ','i',2],['ウ','u',3],['エ','e',3],['オ','o',3],
  ['カ','ka',2],['キ','ki',3],['ク','ku',2],['ケ','ke',3],['コ','ko',2],
  ['サ','sa',3],['シ','shi',3],['ス','su',2],['セ','se',2],['ソ','so',2],
  ['タ','ta',3],['チ','chi',3],['ツ','tsu',3],['テ','te',3],['ト','to',2],
  ['ナ','na',2],['ニ','ni',2],['ヌ','nu',2],['ネ','ne',4],['ノ','no',1],
  ['ハ','ha',2],['ヒ','hi',2],['フ','fu',1],['ヘ','he',1],['ホ','ho',4],
  ['マ','ma',2],['ミ','mi',3],['ム','mu',2],['メ','me',2],['モ','mo',3],
  ['ヤ','ya',2],['ユ','yu',2],['ヨ','yo',3],
  ['ラ','ra',2],['リ','ri',2],['ル','ru',2],['レ','re',1],['ロ','ro',3],
  ['ワ','wa',2],['ヲ','wo',3],['ン','n',2],
].map(([char, reading, strokeCount]) => ({
  id: `k-${char}`,
  mode: 'katakana',
  char: String(char),
  reading: String(reading),
  meaning: '가타카나',
  strokeCount: Number(strokeCount),
  hint: '직선과 각을 분명히 쓰고, シ/ツ·ソ/ン처럼 방향이 헷갈리는 글자는 첫 획 방향을 말하세요.',
}));

const STAGES: Stage[] = ['observe', 'recall', 'write', 'quiz'];
const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3'];

const stageText: Record<Stage, { title: string; desc: string }> = {
  observe: { title: '1. 관찰', desc: '모양, 읽기, 의미를 10초 동안 함께 봅니다.' },
  recall:  { title: '2. 가리기 인출', desc: '글자를 보지 않고 읽기와 뜻을 먼저 떠올립니다.' },
  write:   { title: '3. 손으로 쓰기', desc: '획수와 규칙을 말하면서 캔버스에 크게 씁니다.' },
  quiz:    { title: '4. 즉시 테스트', desc: '정답을 고르고 다음 복습 강도를 결정합니다.' },
};

const kanjiRules = [
  '위에서 아래로',
  '왼쪽에서 오른쪽으로',
  '가로획을 세로획보다 먼저',
  '가운데를 먼저 쓰고 양쪽을 나중에',
  '바깥틀을 먼저, 안쪽을 쓰고, 닫는 획은 마지막',
];

function makeKanjiCard(item: KanjiItem): StudyCard {
  const reading = [item.reading_on, item.reading_kun].filter(Boolean).join(' / ') || '-';
  const card: StudyCard = {
    id: `kanji-${item.id}`,
    mode: 'kanji',
    char: item.character,
    reading,
    meaning: item.meaning,
    strokeCount: item.stroke_count ?? 0,
    hint: `${item.meaning}의 핵심 이미지를 떠올린 뒤 한국 한자음/일본어 읽기를 분리해서 말하세요.`,
    level: item.level as JlptLevel,
  };
  if (item.audio_path) card.audioPath = item.audio_path;
  return card;
}

export function getCardAudioText(card: StudyCard): string {
  if (card.mode !== 'kanji') return elongateKanaForSpeech(card.char);
  const firstReading = card.reading
    .split(/[\/,、，・\s]+/)
    .map((value) => value.trim())
    .find((value) => value.length > 0 && value !== '-');
  return firstReading ?? card.char;
}

export function elongateKanaForSpeech(char: string): string {
  const value = char.trim();
  if (/^[\u3040-\u309f\u30a0-\u30ff]$/u.test(value)) return `${value}ー`;
  return value;
}

export function buildChoices(card: StudyCard, deck: StudyCard[]): string[] {
  const target = card.mode === 'kanji' ? card.meaning : card.reading;
  const seen = new Set([target]);
  const others = deck
    .filter((item) => item.id !== card.id)
    .map((item) => item.mode === 'kanji' ? item.meaning : item.reading)
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 3);
  return [target, ...others].sort(() => Math.random() - 0.5);
}

function readProgress(id: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(`nihongo-n3:char-trainer:${id}`);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeProgress(id: string, delta: number) {
  if (typeof window === 'undefined') return;
  const next = Math.max(0, Math.min(5, readProgress(id) + delta));
  window.localStorage.setItem(`nihongo-n3:char-trainer:${id}`, String(next));
}

export default function CharacterTrainer() {
  const [mode, setMode] = useState<Mode>('hiragana');
  const [level, setLevel] = useState<JlptLevel>('N5');
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('observe');
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const kanjiQuery = useQuery({
    queryKey: ['character-trainer-kanji', level],
    queryFn: async () => {
      const res = await kanjiApi.list({ level, limit: 200 });
      return res.ok ? res.data.map(makeKanjiCard) : [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const deck = useMemo<StudyCard[]>(() => {
    if (mode === 'hiragana') return HIRAGANA;
    if (mode === 'katakana') return KATAKANA;
    return kanjiQuery.data ?? [];
  }, [mode, kanjiQuery.data]);

  const card = deck[index % Math.max(deck.length, 1)];
  const progress = card ? readProgress(card.id) : 0;
  const choices = useMemo(() => card ? buildChoices(card, deck) : [], [card, deck]);
  const expected = card?.mode === 'kanji' ? card.meaning : card?.reading;
  const correct = answer !== null && answer === expected;

  const switchMode = (next: Mode) => {
    setMode(next);
    setIndex(0);
    setStage('observe');
    setRevealed(false);
    setAnswer(null);
  };

  const nextCard = () => {
    setIndex((value) => (value + 1) % Math.max(deck.length, 1));
    setStage('observe');
    setRevealed(false);
    setAnswer(null);
  };

  const complete = (ok: boolean) => {
    if (!card) return;
    writeProgress(card.id, ok ? 1 : -1);
    forceTick((value) => value + 1);
    nextCard();
  };

  if (!card) {
    return (
      <div className="mx-auto max-w-[920px] px-5 py-8 pb-28">
        <Header />
        <ModeControls mode={mode} level={level} onMode={switchMode} onLevel={setLevel} />
        <div className="surface-panel mt-6 p-8 text-center text-sm text-[var(--muted-foreground)]">
          한자 데이터를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 pb-28 sm:px-6 lg:px-10">
      <Header />
      <ModeControls mode={mode} level={level} onMode={switchMode} onLevel={setLevel} />

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
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-center">
              <div className="mx-auto flex aspect-square max-w-[240px] items-center justify-center rounded-xl bg-[var(--card)] shadow-inner">
                <span className="font-serif-jp text-[112px] leading-none text-foreground">
                  {stage === 'recall' && !revealed ? '?' : card.char}
                </span>
              </div>
              <div className="mt-3 flex justify-center">
                <PronunciationButton
                  text={getCardAudioText(card)}
                  label={`${card.char} 발음 듣기`}
                  className="bg-[var(--card)]"
                  forceBrowser
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

            <section className="space-y-4">
              {stage === 'observe' && (
                <InfoPanel card={card} />
              )}

              {stage === 'recall' && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-3 text-sm text-[var(--muted-foreground)]">
                    글자를 가린 상태에서 먼저 소리 내어 말하세요. 답은 마지막에 확인합니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                  >
                    답 확인
                  </button>
                  {revealed && <InfoPanel card={card} compact />}
                </div>
              )}

              {stage === 'write' && (
                <div className="space-y-4">
                  <StrokeRules card={card} />
                  <DrawingPad />
                </div>
              )}

              {stage === 'quiz' && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    {card.mode === 'kanji' ? '이 한자의 뜻은 무엇입니까?' : '이 문자의 발음은 무엇입니까?'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setAnswer(choice)}
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
              )}

              <div className="flex flex-wrap gap-2">
                {STAGES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setStage(item);
                      setAnswer(null);
                      setRevealed(false);
                    }}
                    className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                      stage === item ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {stageText[item].title}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                {stage === 'quiz' && answer !== null ? (
                  <>
                    <button type="button" onClick={() => complete(false)} className="min-h-11 flex-1 rounded-lg border border-[var(--border)] text-sm font-semibold">
                      다시 학습
                    </button>
                    <button type="button" onClick={() => complete(true)} className="min-h-11 flex-1 rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
                      기억됨
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={nextCard} className="min-h-11 w-full rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
                    다음 문자
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>

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
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--accent)]">Moji Trainer</p>
      <h1 className="font-serif-jp text-[40px] font-normal leading-tight text-foreground">
        문자 암기
      </h1>
      <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--muted-foreground)]">
        히라가나, 가타카나, N5-N3 한자를 한 글자씩 보고, 가리고, 쓰고, 테스트하는 장기기억 루프입니다.
      </p>
    </header>
  );
}

function ModeControls({
  mode,
  level,
  onMode,
  onLevel,
}: {
  mode: Mode;
  level: JlptLevel;
  onMode: (mode: Mode) => void;
  onLevel: (level: JlptLevel) => void;
}) {
  return (
    <div className="surface-card flex flex-col gap-3 p-3 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 overflow-x-auto">
        {(['hiragana', 'katakana', 'kanji'] as Mode[]).map((item) => (
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
          {LEVELS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onLevel(item)}
              className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                level === item ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'border border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoPanel({ card, compact = false }: { card: StudyCard; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] ${compact ? 'mt-4 p-3' : 'p-4'}`}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Info label="읽기" value={card.reading} />
        <Info label="의미" value={card.meaning} />
        <Info label="암기 힌트" value={card.hint} wide />
      </dl>
      <div className="mt-4">
        <PronunciationButton
          compact={compact}
          text={getCardAudioText(card)}
          label={`${card.char} 발음 듣기`}
          forceBrowser
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

function DrawingPad() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const point = getPoint(event);
    ctx.strokeStyle = '#3b2f2a';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        aria-label="쓰기 연습 캔버스"
        className="h-[260px] w-full touch-none rounded-lg bg-[linear-gradient(90deg,var(--border)_1px,transparent_1px),linear-gradient(var(--border)_1px,transparent_1px)] bg-[length:40px_40px]"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => { drawing.current = false; }}
        onPointerCancel={() => { drawing.current = false; }}
      />
      <button type="button" onClick={clear} className="mt-3 min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold">
        지우기
      </button>
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
