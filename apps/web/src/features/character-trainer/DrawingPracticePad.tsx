import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { evaluateDrawing } from './logic';
import type { DrawingEvaluation, DrawingStats } from './types';

export type WritingPracticeCard = {
  char: string;
  reading: string;
  meaning: string;
  strokeCount: number;
  mode?: string;
};

type DrawingPracticePadProps = {
  card: WritingPracticeCard;
  quiz?: boolean;
  quizPrompt?: string;
  canvasLabel?: string;
};

/**
 * Shared freehand practice surface. The score checks stroke count, scale, and
 * placement only; it deliberately does not claim to recognize handwritten text.
 */
export function DrawingPracticePad({
  card,
  quiz = false,
  quizPrompt,
  canvasLabel = '쓰기 연습 캔버스',
}: DrawingPracticePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const bounds = useRef<DrawingStats['bounds']>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<DrawingEvaluation | null>(null);

  const updateBounds = (x: number, y: number) => {
    bounds.current = bounds.current
      ? {
          minX: Math.min(bounds.current.minX, x),
          minY: Math.min(bounds.current.minY, y),
          maxX: Math.max(bounds.current.maxX, x),
          maxY: Math.max(bounds.current.maxY, y),
        }
      : { minX: x, minY: y, maxX: x, maxY: y };
  };

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
    updateBounds(point.x, point.y);
    setStrokeCount((value) => value + 1);
    setPointCount((value) => value + 1);
    setResult(null);
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
    updateBounds(point.x, point.y);
    setPointCount((value) => value + 1);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    bounds.current = null;
    setStrokeCount(0);
    setPointCount(0);
    setResult(null);
  };

  const check = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setResult(evaluateDrawing({
      strokeCount,
      pointCount,
      bounds: bounds.current,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      expectedStrokes: card.strokeCount,
    }));
    setAttempts((value) => value + 1);
  };

  const defaultQuizPrompt = card.mode === 'kanji'
    ? '뜻과 읽기를 보고 한자를 쓰세요.'
    : `${card.reading} 발음의 문자를 떠올려 쓰세요.`;

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      {quiz && (
        <div className="mb-3 rounded-lg bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
          {quizPrompt ?? defaultQuizPrompt}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        aria-label={canvasLabel}
        className="h-[260px] w-full touch-none rounded-lg bg-[linear-gradient(90deg,var(--border)_1px,transparent_1px),linear-gradient(var(--border)_1px,transparent_1px)] bg-[length:40px_40px]"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => { drawing.current = false; }}
        onPointerCancel={() => { drawing.current = false; }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={check} className="min-h-10 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white">
          채점하기
        </button>
        <button type="button" onClick={clear} className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold">
          지우기
        </button>
        <span className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--muted-foreground)]">
          입력 {strokeCount}획 / 권장 {card.strokeCount || '?'}획
        </span>
        {attempts > 0 && (
          <span className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--muted-foreground)]">
            반복 {attempts}회
          </span>
        )}
      </div>
      {result && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
          result.status === 'good'
            ? 'bg-green-50 text-green-700'
            : result.status === 'retry'
              ? 'bg-yellow-50 text-yellow-800'
              : 'bg-red-50 text-red-700'
        }`}>
          <p className="font-semibold">{result.message} ({result.score}점)</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {result.details.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
