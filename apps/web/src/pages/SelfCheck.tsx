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
  reading_score: number | null;
  listening_score: number | null;
  speaking_score: number | null;
  writing_score: number | null;
  domain_score: number | null;
  notes: string | null;
  updated_at: string | null;
}

interface SelfCheckPayload {
  week_no: number;
  vocab_score: number;
  grammar_score: number;
  reading_score: number;
  listening_score: number;
  speaking_score: number;
  writing_score: number;
  domain_score: number;
  notes?: string;
}

type SelfCheckCategory = 'vocab' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'strategy';

interface SelfCheckTemplate {
  code: string;
  level: string;
  category: SelfCheckCategory;
  sort_order: number;
  item_ko: string;
  evidence_ko: string | null;
  recommendation_ko: string;
  source_name: string;
  source_url: string;
}

interface TemplateResponse {
  level: string;
  templates: SelfCheckTemplate[];
}

const CATEGORY_ORDER: SelfCheckCategory[] = ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing', 'strategy'];
const CATEGORY_TITLE: Record<SelfCheckCategory, string> = {
  vocab: '어휘',
  grammar: '문법',
  reading: '독해',
  listening: '청해',
  speaking: '회화',
  writing: '작문',
  strategy: '시험 전략',
};

const DEFAULT_SELF_CHECK_TEMPLATES: SelfCheckTemplate[] = [
  { code: 'n3_vocab_01', level: 'N3', category: 'vocab', sort_order: 10, item_ko: 'N3 지문에서 모르는 단어가 있어도 앞뒤 문맥으로 뜻을 추정할 수 있다.', evidence_ko: 'JLPT N3는 어휘와 문맥 이해를 언어지식 영역에서 확인한다.', recommendation_ko: '매일 N3 어휘 20개를 예문과 함께 SRS에 추가하고 문장 단위로 복습하세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_vocab_02', level: 'N3', category: 'vocab', sort_order: 20, item_ko: '한자로 쓰인 N3 빈출 단어의 읽기와 의미를 함께 떠올릴 수 있다.', evidence_ko: 'N3 어휘 영역에는 한자 읽기와 표기 이해가 포함된다.', recommendation_ko: '한자-읽기-뜻을 한 카드에 묶어 복습하고, 오답 한자는 같은 음독 단어와 같이 정리하세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_grammar_01', level: 'N3', category: 'grammar', sort_order: 10, item_ko: 'N3 문형을 보고 의미, 접속, 쓰는 상황을 함께 설명할 수 있다.', evidence_ko: 'N3는 문법 지식과 독해를 같은 시험 시간 안에서 확인한다.', recommendation_ko: '문형은 뜻만 보지 말고 접속 형태와 예문 2개를 같이 소리 내어 읽으세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_grammar_02', level: 'N3', category: 'grammar', sort_order: 20, item_ko: '비슷한 문형의 의미 차이와 쓰임 차이를 구분할 수 있다.', evidence_ko: 'N3 문법은 문장 안에서 적절한 표현 선택을 요구한다.', recommendation_ko: '헷갈리는 문형은 주체, 의도, 결과, 예문을 나눠 비교 노트를 만드세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_reading_01', level: 'N3', category: 'reading', sort_order: 10, item_ko: '짧은 안내문, 이메일, 공지문에서 핵심 정보를 빠르게 찾을 수 있다.', evidence_ko: 'N3는 일상적인 주제의 글을 읽고 내용을 이해하는 능력을 본다.', recommendation_ko: '읽기 전에 질문을 먼저 보고 날짜, 조건, 이유, 결론에 표시하면서 읽으세요.', source_name: 'JLPT 레벨 요약', source_url: 'https://jlpt.jp/sp/e/about/levelsummary.html' },
  { code: 'n3_reading_02', level: 'N3', category: 'reading', sort_order: 20, item_ko: '중간 길이의 글에서 필자의 주장과 이유를 구분할 수 있다.', evidence_ko: 'N3 독해는 글의 요지와 세부 정보를 함께 확인한다.', recommendation_ko: '문단마다 한 줄 요약을 한국어로 적고 마지막 문장에서 결론 표현을 찾으세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_listening_01', level: 'N3', category: 'listening', sort_order: 10, item_ko: '일상 대화에서 누가, 무엇을, 왜 하는지 핵심 정보를 들을 수 있다.', evidence_ko: 'N3 청해는 요지와 세부 정보를 듣고 이해하는 능력을 본다.', recommendation_ko: '스크립트를 보기 전 2회 듣고 사람, 장소, 행동, 이유만 받아 적으세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_listening_02', level: 'N3', category: 'listening', sort_order: 20, item_ko: '자연스러운 속도의 짧은 대화에서 정답 단서를 놓치지 않는다.', evidence_ko: 'N3 청해 시간은 40분이며 실제 속도 적응이 필요하다.', recommendation_ko: '브라우저 일본어 음성으로 먼저 듣고 스크립트를 보며 놓친 조사를 확인하세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_speaking_01', level: 'N3', category: 'speaking', sort_order: 10, item_ko: '일상 주제에 대해 3~5문장으로 내 의견과 이유를 말할 수 있다.', evidence_ko: 'JF Standard Can-do는 실제 상황에서 일본어로 무엇을 할 수 있는지에 초점을 둔다.', recommendation_ko: '오늘 배운 문형 하나를 써서 30초 자기 의견 말하기를 녹음하세요.', source_name: 'JF Standard Can-do', source_url: 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do' },
  { code: 'n3_writing_01', level: 'N3', category: 'writing', sort_order: 10, item_ko: '배운 문형을 사용해 짧은 일기나 학습 기록을 일본어로 쓸 수 있다.', evidence_ko: 'Can-do는 실제 산출 활동도 학습 진단에 포함한다.', recommendation_ko: '하루 3문장 일본어 기록을 쓰고 문형, 어휘, 조사를 하나씩 점검하세요.', source_name: 'JF Standard Can-do', source_url: 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do' },
  { code: 'n3_strategy_01', level: 'N3', category: 'strategy', sort_order: 10, item_ko: 'N3 시험의 3개 주요 영역과 시간 배분을 알고 있다.', evidence_ko: 'N3는 어휘 30분, 문법·독해 70분, 청해 40분으로 진행된다.', recommendation_ko: '주 1회는 실제 시간에 맞춰 어휘, 문법·독해, 청해 블록 학습을 해보세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_strategy_02', level: 'N3', category: 'strategy', sort_order: 20, item_ko: '최근 7일 학습에서 가장 약한 영역을 하나 고르고 보충 계획을 세울 수 있다.', evidence_ko: 'JLPT는 총점뿐 아니라 영역별 약점 관리가 중요하다.', recommendation_ko: '70점 미만 영역을 하나 골라 3일 보충 루틴을 만드세요.', source_name: 'JLPT 공식 성적 구분', source_url: 'https://www.jlpt.jp/e/guideline/results.html' },
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

function templatesFor(category: SelfCheckCategory, templates: SelfCheckTemplate[]): SelfCheckTemplate[] {
  return templates.filter((item) => item.category === category);
}

export function calcScore(category: SelfCheckCategory, local: Set<string>, templates: SelfCheckTemplate[] = DEFAULT_SELF_CHECK_TEMPLATES): number {
  const items = templatesFor(category, templates);
  const checked = items.filter((item) => local.has(item.code)).length;
  return items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
}

export function buildSelfCheckPayload(
  weekNo: number,
  local: Set<string>,
  templates: SelfCheckTemplate[] = DEFAULT_SELF_CHECK_TEMPLATES,
): SelfCheckPayload {
  const strategyScore = calcScore('strategy', local, templates);
  const speakingScore = calcScore('speaking', local, templates);
  const writingScore = calcScore('writing', local, templates);

  return {
    week_no: weekNo,
    vocab_score: calcScore('vocab', local, templates),
    grammar_score: calcScore('grammar', local, templates),
    reading_score: calcScore('reading', local, templates),
    listening_score: calcScore('listening', local, templates),
    speaking_score: speakingScore,
    writing_score: writingScore,
    domain_score: average([strategyScore, speakingScore, writingScore]),
    notes: JSON.stringify({ checked_items: [...local].sort(), template_level: 'N3' }),
  };
}

function scoresFromSaved(row: SelfCheckRow | null | undefined): number[] | null {
  if (!row) return null;
  return [
    row.vocab_score ?? 0,
    row.grammar_score ?? 0,
    row.reading_score ?? row.writing_score ?? 0,
    row.listening_score ?? 0,
    row.speaking_score ?? row.domain_score ?? 0,
    row.writing_score ?? 0,
  ];
}

function sectionsFromTemplates(templates: SelfCheckTemplate[]) {
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      title: CATEGORY_TITLE[category],
      items: templatesFor(category, templates).sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((section) => section.items.length > 0);
}

function buildRecommendations(local: Set<string>, templates: SelfCheckTemplate[]): SelfCheckTemplate[] {
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      score: calcScore(category, local, templates),
      item: templatesFor(category, templates).find((template) => !local.has(template.code)),
    }))
    .filter((entry): entry is { category: SelfCheckCategory; score: number; item: SelfCheckTemplate } => Boolean(entry.item))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((entry) => entry.item);
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

  const { data: templateData } = useQuery<TemplateResponse>({
    queryKey: ['self-check-templates', 'N3'],
    queryFn: async ({ signal }) => {
      const res = await api.get<TemplateResponse>('/self-check/templates', { level: 'N3' }, { signal });
      return res.ok ? res.data : { level: 'N3', templates: [] };
    },
    staleTime: 1000 * 60 * 60,
  });

  const templates = templateData?.templates.length ? templateData.templates : DEFAULT_SELF_CHECK_TEMPLATES;
  const sections = useMemo(() => sectionsFromTemplates(templates), [templates]);
  const validCodes = useMemo(() => new Set(templates.map((item) => item.code)), [templates]);
  const checkedLocal = useMemo(
    () => new Set([...local].filter((key) => validCodes.has(key))),
    [local, validCodes],
  );

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

  const allItems = templates;
  const checkedCount = checkedLocal.size;
  const totalCount = allItems.length;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const localRadarScores = useMemo(() => [
    calcScore('vocab', checkedLocal, templates),
    calcScore('grammar', checkedLocal, templates),
    calcScore('reading', checkedLocal, templates),
    calcScore('listening', checkedLocal, templates),
    calcScore('speaking', checkedLocal, templates),
    calcScore('writing', checkedLocal, templates),
  ], [checkedLocal, templates]);

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
  const recommendations = buildRecommendations(checkedLocal, templates);

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

      <div className="card-hairline rounded-xl p-5 mb-8">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="font-pretendard text-[15px] font-semibold text-foreground">
            {t('selfCheck.recommendTitle')}
          </h2>
          <p className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
            {t('selfCheck.recommendSubtitle')}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((item) => (
            <article key={item.code} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="mb-2 text-[11px] font-semibold text-[var(--accent)]">
                {CATEGORY_TITLE[item.category]}
              </p>
              <p className="mb-3 text-[13px] leading-relaxed text-foreground">
                {item.recommendation_ko}
              </p>
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                {item.evidence_ko}
              </p>
            </article>
          ))}
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
          {sections.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-pretendard text-[15px] font-medium text-foreground">{section.title}</h2>
                <span className="text-[11px] text-[var(--muted-foreground)] font-pretendard">{section.items.length}{t('selfCheck.itemUnit')}</span>
              </div>
              <div className="card-hairline rounded-lg divide-y divide-[var(--border)]">
                {section.items.map((item) => {
                  const key = item.code;
                  const isChecked = checkedLocal.has(key);
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
                      <span className={`font-pretendard text-[13px] leading-relaxed ${isChecked ? 'line-through text-[var(--muted-foreground)]' : 'text-foreground'}`}>
                        {item.item_ko}
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
          onClick={() => submit.mutate(buildSelfCheckPayload(selectedWeek, checkedLocal, templates))}
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
