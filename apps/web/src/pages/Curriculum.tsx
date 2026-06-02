/**
 * Curriculum — 16주 학습 커리큘럼 타임라인
 * Figma Make 디자인 적용 + 실제 API 데이터 연결
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useCurrentWeek } from '../hooks/useCurrentWeek';

interface Week {
  week:     number;
  theme:    string;
  level:    string;
  progress: number;
  vocab_count?: number;
  grammar_count?: number;
  estimated_min?: number;
  topics?: string[];
  sample_vocab?: string[];
  sample_grammar?: string[];
}

interface CurriculumApiWeek {
  week_no?: number;
  week?: number;
  theme?: string;
  vocab_target?: number;
  grammar_target?: number;
  kanji_target?: number;
  sentence_target?: number;
  milestone_test?: string | null;
}

function weekState(week: number, currentWeek: number): 'done' | 'current' | 'upcoming' {
  if (week < currentWeek) return 'done';
  if (week === currentWeek) return 'current';
  return 'upcoming';
}

export function normalizeCurriculumWeek(row: CurriculumApiWeek): Week {
  const week = row.week_no ?? row.week ?? 1;
  return {
    week,
    theme: row.theme ?? `Week ${week}`,
    level: 'N3',
    progress: 0,
    vocab_count: row.vocab_target ?? 0,
    grammar_count: row.grammar_target ?? 0,
    estimated_min: Math.max(30, Math.round(
      ((row.vocab_target ?? 0) * 1.2) +
      ((row.grammar_target ?? 0) * 5) +
      ((row.kanji_target ?? 0) * 1.5) +
      ((row.sentence_target ?? 0) * 1.5),
    )),
    topics: row.milestone_test ? [row.milestone_test] : [],
  };
}

export default function Curriculum() {
  const { week: currentWeek } = useCurrentWeek();
  const { t } = useTranslation();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  // null 이면 useEffect 로 currentWeek 로 초기화

  const { data: weeks, isLoading } = useQuery<Week[]>({
    queryKey: ['curriculum'],
    queryFn: async () => {
      const res = await api.get<CurriculumApiWeek[]>('/curriculum');
      return res.ok ? res.data.map(normalizeCurriculumWeek) : [];
    },
    staleTime: 1000 * 60 * 30,
  });

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="font-serif-jp text-[48px] font-normal text-foreground leading-none mb-3">
          {t('curriculum.planTitle')}
        </h1>
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)]">
          {t('curriculum.subtitle')}
        </p>
      </div>

      {/* 현재 주차 표시 */}
      <div className="mb-8 px-4 py-3 bg-[var(--accent-soft)] border-l-2 border-[var(--accent)] rounded-r-lg">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse-ring inline-block" />
          <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--accent)] font-medium">{t('curriculum.current')}</span>
        </div>
        <div className="font-sans-jp text-[15px] font-medium text-foreground">
          {t('curriculum.weekLabel', { week: currentWeek })}
        </div>
      </div>

      {/* 타임라인 */}
      {isLoading ? (
        <LoadingTimeline />
      ) : (
        <div className="relative">
          {/* 수직 라인 */}
          <div className="absolute left-[76px] top-0 bottom-0 w-[1px] bg-[var(--border)]" />

          <div className="space-y-0">
            {(weeks ?? FALLBACK_WEEKS).map((w) => {
              const state = weekState(w.week, currentWeek);
              const isExpanded = expandedWeek === w.week;

              return (
                <div key={w.week}>
                  {/* 주차 행 */}
                  <button
                    className="w-full flex items-center gap-0 text-left hover:bg-accent-soft-10 transition-colors rounded"
                    onClick={() => setExpandedWeek(isExpanded ? null : w.week)}
                  >
                    {/* 주차 라벨 (왼쪽 80px) */}
                    <div className="w-[76px] text-right pr-4 shrink-0 py-4">
                      <span className={`text-[11px] font-medium ${state === 'current' ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]'}`}>
                        {t('curriculum.weekShort', { week: w.week })}
                      </span>
                    </div>

                    {/* 타임라인 노드 */}
                    <div className="w-8 flex justify-center items-center shrink-0 py-4 relative z-10">
                      {state === 'done' && (
                        <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                      )}
                      {state === 'current' && (
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--accent-soft)] animate-pulse-ring" />
                      )}
                      {state === 'upcoming' && (
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-[var(--border)] bg-card" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 py-4 pr-4 flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className={`font-sans-jp text-[14px] font-medium leading-snug ${
                          state === 'current' ? 'text-[var(--accent)]' : 'text-foreground'
                        }`}>
                          {w.theme.startsWith('Week ') ? t('curriculum.fallbackTheme', { week: w.week }) : w.theme}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {w.vocab_count !== undefined && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">{t('curriculum.vocabCount', { count: w.vocab_count })}</span>
                          )}
                          {w.grammar_count !== undefined && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">{t('curriculum.grammarCount', { count: w.grammar_count })}</span>
                          )}
                          {w.estimated_min !== undefined && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">{t('curriculum.estimatedMinutes', { minutes: w.estimated_min })}</span>
                          )}
                          {state === 'done' && (
                            <span className="px-1.5 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] text-[9px] rounded-full">{t('curriculum.complete')}</span>
                          )}
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-[var(--muted-foreground)] shrink-0 transition-transform mt-0.5 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* 펼쳐진 상세 */}
                  {isExpanded && (
                    <div className="ml-[84px] mr-4 mb-4 -mt-1">
                      <div className="border-[0.5px] border-[var(--border)] rounded-lg p-4 bg-card">
                        {/* 토픽 태그 */}
                        {w.topics && w.topics.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-2">{t('curriculum.topics')}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {w.topics.map((t) => (
                                <span key={t} className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] rounded-full">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 샘플 어휘 */}
                        {w.sample_vocab && w.sample_vocab.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-2">{t('curriculum.vocabSample')}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {w.sample_vocab.map((v) => (
                                <span key={v} className="px-2 py-0.5 border-[0.5px] border-[var(--border)] rounded text-[12px] font-sans-jp text-foreground bg-card">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 샘플 문법 */}
                        {w.sample_grammar && w.sample_grammar.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-2">{t('curriculum.grammarSample')}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {w.sample_grammar.map((g) => (
                                <span key={g} className="px-2 py-0.5 border-[0.5px] border-[var(--border)] rounded text-[12px] font-sans-jp text-foreground bg-card">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {state === 'current' && (
                          <div className="mt-3 pt-3 border-t-[0.5px] border-[var(--border)]">
                            <a
                              href="/review"
                              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity inline-block"
                            >
                              {t('curriculum.startReview')}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 구분선 */}
                  <div className="ml-[108px] border-b-[0.5px] border-[var(--border)]" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingTimeline() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-16 h-4 bg-[var(--border)] rounded animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-[var(--border)] animate-pulse" />
          <div className="flex-1 h-4 bg-[var(--border)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* API 응답이 없을 때 쓰는 기본 데이터 (progress는 런타임에서 weekState로 결정) */
const FALLBACK_WEEKS: Week[] = Array.from({ length: 16 }, (_, i) => ({
  week: i + 1,
  theme: `Week ${i + 1} — 학습 주제`,
  level: 'N3',
  progress: 0,
  vocab_count: 30,
  grammar_count: 5,
  estimated_min: 45,
}));
