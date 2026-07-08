import { useTranslation } from 'react-i18next';
import { RADAR_LABEL_KEYS } from './data';

export function RadarChart({ scores }: { scores: number[] }) {
  const { t } = useTranslation();
  const cx = 140, cy = 140, r = 100;
  const N = 6;
  const step = (2 * Math.PI) / N;
  const getPoint = (i: number, rr: number) => [
    cx + rr * Math.cos(step * i - Math.PI / 2),
    cy + rr * Math.sin(step * i - Math.PI / 2),
  ] as [number, number];

  const polygonPts = scores.map((s, i) => getPoint(i, (s / 100) * r)).map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg viewBox="0 0 280 280" className="w-[200px] h-[200px]">
      {[20, 40, 60, 80, 100].map((pct) => (
        <polygon
          key={pct}
          points={Array.from({ length: N }, (_, i) => getPoint(i, (pct / 100) * r)).map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth="0.5"
        />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = getPoint(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="0.5" />;
      })}
      <polygon points={polygonPts} fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="1.5" />
      {RADAR_LABEL_KEYS.map((labelKey, i) => {
        const [x, y] = getPoint(i, r + 18);
        return (
          <text
            key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="var(--muted-foreground)"
            fontFamily="Noto Sans JP, sans-serif"
          >
            {t(`selfCheck.radar.${labelKey}`)}
          </text>
        );
      })}
    </svg>
  );
}
