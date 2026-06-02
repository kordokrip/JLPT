/**
 * QuizTimer — 경과 시간 표시 (초 단위 카운트업)
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  running: boolean;
  onTick?: (elapsed: number) => void;
}

export default function QuizTimer({ running, onTick }: Props) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          onTick?.(next);
          return next;
        });
      }, 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, onTick]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <time
      dateTime={`PT${elapsed}S`}
      aria-label={t('stats.elapsedTime', { minutes: mm, seconds: ss })}
      className="font-mono text-[13px] text-[var(--muted-foreground)] tabular-nums"
    >
      {mm}:{ss}
    </time>
  );
}
