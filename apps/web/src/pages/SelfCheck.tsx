/**
 * SelfCheck — 자가진단 체크리스트
 * Figma Make 디자인 적용 + SVG 레이더 차트
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useCurrentWeek } from '../hooks/useCurrentWeek';

interface SelfCheckRow {
  week_no: number;
  vocab_score: number | null;
  grammar_score: number | null;
  listening_score: number | null;
  writing_score: number | null;
  domain_score: number | null;
  notes: string | null;
  updated_at: string | null;
}

interface SelfCheckPayload {
  week_no: number;
  vocab_score: number;
  grammar_score: number;
  listening_score: number;
  writing_score: number;
  domain_score: number;
}

/* 정적 체크리스트 섹션 */
const SECTIONS = [
  { key: '基礎', labelKey: 'base', items: ['ひらがな・カタカナを読める', 'N5基本文型を理解している', '日常挨拶ができる', '数字・時間表現がわかる', '基本助詞（は/が/を/に）を使える'] },
  { key: '文法', labelKey: 'grammar', items: ['て形・た形・ない形が作れる', '条件表現（〜たら・〜ば・〜と）がわかる', '受け身・使役・使役受け身を理解している', '〜ている/〜てある/〜てしまうの違いがわかる', 'N3レベルの文型を10個以上使える'] },
  { key: '語彙', labelKey: 'vocab', items: ['N5〜N4語彙1000語以上を知っている', 'N3語彙を300語以上学習した', '複合語・派生語がわかる', 'カタカナ語（外来語）を読める', '文脈から意味を推測できる'] },
  { key: '実践', labelKey: 'practice', items: ['短い文章を読んで内容を理解できる', '日常会話で基本的なやり取りができる', 'メールや手紙の基本的な書き方がわかる', 'N3レベルの読解問題を練習した', '模擬試験を1回以上受けた'] },
  { key: '試験', labelKey: 'exam', items: ['JLPT N3の試験形式を理解している', '時間配分の練習をした', '言語知識・読解・聴解の配点がわかる', '苦手な分野を特定している', '試験当日の準備ができている'] },
  { key: '習慣', labelKey: 'habit', items: ['毎日30分以上日本語を学習している', 'SRS復習を毎日続けている', '日本語のコンテンツ（アニメ・音楽など）に触れている', '学習記録をつけている'] },
  { key: 'リスニング', labelKey: 'listening', items: ['自然なスピードの会話がある程度わかる', 'N3レベルの聴解問題を練習した', '発音・アクセントを意識している'] },
];

const RADAR_LABEL_KEYS = ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing'] as const;
const STORAGE_PREFIX = 'nihongo-n3:self-check';

function parseRouteWeek(rawWeek: string | undefined): number | null {
  if (!rawWeek) return null;
  const week = Number(rawWeek);
  return Number.isInteger(week) && week >= 1 && week <= 52 ? week : null;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

export function calcScore(sectionKey: string, local: Set<string>, sections: typeof SECTIONS = SECTIONS): number {
  const idx = sections.findIndex(s => s.key === sectionKey);
  if (idx === -1) return 0;
  const sec = sections[idx];
  if (!sec) return 0;
  const items = sec.items;
  const checked = items.filter((_, ii) => local.has(`${idx}-${ii}`)).length;
  return items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
}

export function buildSelfCheckPayload(weekNo: number, local: Set<string>): SelfCheckPayload {
  const baseScore = calcScore('基礎', local);
  const examScore = calcScore('試験', local);
  const habitScore = calcScore('習慣', local);

  return {
    week_no: weekNo,
    vocab_score: calcScore('語彙', local),
    grammar_score: calcScore('文法', local),
    listening_score: calcScore('リスニング', local),
    writing_score: calcScore('実践', local),
    domain_score: average([baseScore, examScore, habitScore]),
  };
}

function scoresFromSaved(row: SelfCheckRow | null | undefined): number[] | null {
  if (!row) return null;
  const writing = row.writing_score ?? 0;
  return [
    row.vocab_score ?? 0,
    row.grammar_score ?? 0,
    writing,
    row.listening_score ?? 0,
    row.domain_score ?? 0,
    writing,
  ];
}

function RadarChart({ scores }: { scores: number[] }) {
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

export default function SelfCheck() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { week: routeWeek } = useParams<{ week?: string }>();
  const { week: currentWeek, isLoading: isCurrentWeekLoading } = useCurrentWeek();
  const selectedWeek = parseRouteWeek(routeWeek) ?? currentWeek;
  const storageKey = `${STORAGE_PREFIX}:${selectedWeek}`;

  const { data: savedCheck, isLoading } = useQuery<SelfCheckRow | null>({
    queryKey: ['self-check', selectedWeek],
    queryFn: async ({ signal }) => {
      const res = await api.get<SelfCheckRow>(`/self-check/${selectedWeek}`, undefined, { signal });
      return res.ok ? res.data : null;
    },
    enabled: !isCurrentWeekLoading,
    staleTime: 1000 * 60 * 5,
  });

  const submit = useMutation({
    mutationFn: (payload: SelfCheckPayload) => api.post('/self-check', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['self-check', selectedWeek] });
      void qc.invalidateQueries({ queryKey: ['self-check-scores'] });
    },
  });

  const [local, setLocal] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      const keys = saved ? JSON.parse(saved) as string[] : [];
      setLocal(new Set(keys));
    } catch {
      setLocal(new Set());
    }
  }, [storageKey]);

  const toggle = (key: string) => {
    setLocal((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      }
      return next;
    });
  };

  const allItems = SECTIONS.flatMap((s, si) =>
    s.items.map((text, ii) => ({ id: `${si}-${ii}`, section: s.key, text }))
  );
  const checkedCount = local.size;
  const totalCount = allItems.length;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const localRadarScores = useMemo(() => [
    calcScore('語彙', local),
    calcScore('文法', local),
    calcScore('実践', local),
    calcScore('リスニング', local),
    calcScore('実践', local),
    calcScore('習慣', local),
  ], [local]);

  const { data: scoresData } = useQuery<{ scores: number[]; hasData: boolean }>({
    queryKey: ['self-check-scores'],
    queryFn: async ({ signal }) => {
      const res = await api.get<{ scores: number[]; hasData: boolean }>('/self-check/scores', undefined, { signal });
      return res.ok ? res.data : { scores: [0, 0, 0, 0, 0, 0], hasData: false };
    },
    staleTime: 1000 * 60 * 5,
  });

  const savedRadarScores = scoresFromSaved(savedCheck);
  const radarScores = checkedCount > 0
    ? localRadarScores
    : savedRadarScores ?? (scoresData?.hasData ? scoresData.scores : localRadarScores);

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      <div className="mb-8">
        <h1 className="font-serif-jp text-[48px] font-normal text-foreground leading-none mb-3">
          {t('selfCheck.title')}
        </h1>
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)]">
          {t('selfCheck.subtitle')}
        </p>
        <p className="font-pretendard text-[12px] text-[var(--muted-foreground)] mt-2">
          {t('curriculum.weekLabel', { week: selectedWeek })}
        </p>
      </div>

      <div className="card-hairline rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center flex-shrink-0">
          <div className="font-serif-jp text-[56px] text-[var(--accent)] font-normal leading-none">
            {isLoading ? '-' : `${pct}%`}
          </div>
          <div className="font-pretendard text-[12px] text-[var(--muted-foreground)] mt-1">
            {checkedCount} / {totalCount}
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <RadarChart scores={radarScores} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section, si) => (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-sans-jp text-[15px] font-medium text-foreground">{section.key}</h2>
                <span className="text-[11px] text-[var(--muted-foreground)] font-pretendard">{t(`selfCheck.sections.${section.labelKey}`)}</span>
              </div>
              <div className="card-hairline rounded-lg divide-y divide-[var(--border)]">
                {section.items.map((text, ii) => {
                  const key = `${si}-${ii}`;
                  const isChecked = local.has(key);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-accent-soft-10 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-card'
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggle(key)} />
                      <span className={`font-sans-jp text-[13px] ${isChecked ? 'line-through text-[var(--muted-foreground)]' : 'text-foreground'}`}>
                        {text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(buildSelfCheckPayload(selectedWeek, local))}
          className="w-full py-3 bg-[var(--accent)] text-white rounded-lg font-medium font-pretendard text-[14px] hover:opacity-90 transition-opacity press-feedback disabled:opacity-50"
        >
          {submit.isPending ? t('common.saving') : t('selfCheck.save')}
        </button>
        {submit.isError && (
          <p className="text-center text-[12px] text-[var(--destructive)] mt-2">
            {(submit.error as Error).message}
          </p>
        )}
        {submit.isSuccess && (
          <p className="text-center text-[12px] text-[var(--muted-foreground)] mt-2">{t('selfCheck.saved')}</p>
        )}
      </div>
    </div>
  );
}
