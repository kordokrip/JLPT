/**
 * ReadingDetail.tsx — Phase 8-D: 독해 지문 상세 + 문제 풀기
 *
 * Route: /reading/:id
 *
 * 기능:
 *  - 데스크탑: 좌(지문) / 우(문제) 2열 레이아웃
 *  - 모바일: 本文 / 問題 탭 전환
 *  - 후리가나 토글 (ruby 태그 숨김)
 *  - 단어 탭 → 의미 팝오버 (vocab/search API)
 *  - 답안 제출 후 해설 + N3 어휘·문법 태그 표시
 */
import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

// ─── 타입 ──────────────────────────────────────────────────────────────────

interface RQuestion {
  id:             number;
  question_ja:    string;
  question_ko:    string;
  choices:        string[];
  answer_index:   number;
  explanation_ko: string | null;
}

interface PassageFull {
  id:                 number;
  level:              string;
  genre:              string;
  title_ja:           string;
  body_ja:            string;
  body_ko:            string;
  word_count:         number;
  vocab_ids:          number[];
  grammar_ids:        number[];
  audio_r2_key:       string | null;
  source_attribution: string | null;
  questions:          RQuestion[];
}

interface SubmitRes {
  attempt_id: number;
  score:      number;
  correct:    number;
  total:      number;
  detail: Array<{
    question_id: number;
    user_answer: number;
    correct:     boolean;
  }>;
}

interface VocabPopover { word: string; reading: string; meaning_ko: string }

// ─── 팝오버 (단어 탭) ──────────────────────────────────────────────────────

function WordPopover({
  word,
  anchorRect,
  onClose,
}: {
  word: string;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['vocab-popover', word],
    queryFn:  async () => {
      const res = await api.get<{ items: Array<{ reading: string; meaning_ko: string }> }>(
        '/vocab/search',
        { q: word, limit: 1 },
      );
      if (!res.ok || res.data.items.length === 0) return null;
      return res.data.items[0]!;
    },
    staleTime: 60_000,
  });

  const TOP_OFFSET  = 8;
  const style: React.CSSProperties = {
    position:  'fixed',
    left:      `${anchorRect.left}px`,
    top:       `${anchorRect.bottom + TOP_OFFSET}px`,
    zIndex:    50,
    minWidth:  '140px',
    maxWidth:  '240px',
  };

  return (
    <>
      {/* 배경 오버레이 (클릭 닫기) */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="tooltip"
        style={style}
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg
                   p-3 font-pretendard text-[13px] text-foreground"
      >
        <div className="font-sans-jp font-semibold text-[16px] mb-1">{word}</div>
        {isLoading && (
          <div className="text-[var(--muted-foreground)]">{t('reading.searching')}</div>
        )}
        {!isLoading && data && (
          <>
            <div className="text-[var(--muted-foreground)] text-[12px] mb-1">
              {data.reading}
            </div>
            <div>{data.meaning_ko}</div>
          </>
        )}
        {!isLoading && !data && (
          <div className="text-[var(--muted-foreground)]">{t('reading.noWordResult')}</div>
        )}
      </div>
    </>
  );
}

// ─── 지문 렌더러 ──────────────────────────────────────────────────────────

function PassageBody({
  bodyJa,
  showFurigana,
  onWordTap,
}: {
  bodyJa:       string;
  showFurigana: boolean;
  onWordTap:    (word: string, rect: DOMRect) => void;
}) {
  const { t } = useTranslation();
  // 간단한 한자 세그먼트 감지: 한자 2자 이상 연속 구간을 버튼으로 래핑
  // 후리가나 마크업 없는 일반 텍스트이므로 단어 경계는 CJK 글자 단위로 처리
  const handleClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') {
      const word = target.textContent ?? '';
      onWordTap(word, target.getBoundingClientRect());
    }
  };

  // body_ja를 단락 단위로 분리 후, 한자 포함 단어를 버튼으로 감싸기
  const paragraphs = bodyJa.split('\n').filter(Boolean);

  return (
    <div onClick={handleClick} className="space-y-4">
      {paragraphs.map((para, pi) => (
        <p
          key={pi}
          className={`font-sans-jp text-[16px] leading-[2] text-foreground ${
            !showFurigana ? '[&_rt]:hidden' : ''
          }`}
        >
          {splitToTokens(para).map((token, ti) =>
            token.isCJK ? (
              <button
                key={ti}
                type="button"
                title={t('reading.wordSearch')}
                className="underline decoration-dotted decoration-[var(--accent)]
                           cursor-pointer hover:text-[var(--accent)] transition-colors
                           bg-transparent border-0 p-0 font-inherit text-inherit"
              >
                {token.text}
              </button>
            ) : (
              <span key={ti}>{token.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

/** 텍스트를 CJK / 비CJK 토큰으로 분리 */
function splitToTokens(text: string): Array<{ text: string; isCJK: boolean }> {
  const tokens: Array<{ text: string; isCJK: boolean }> = [];
  let buf = '';
  let inCJK = false;

  for (const ch of text) {
    const cjk = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(ch);
    if (cjk !== inCJK) {
      if (buf) tokens.push({ text: buf, isCJK: inCJK });
      buf   = ch;
      inCJK = cjk;
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push({ text: buf, isCJK: inCJK });
  return tokens;
}

// ─── 문제 패널 ────────────────────────────────────────────────────────────

function QuestionsPanel({
  questions,
  submitted,
  detail,
  onSubmit,
  isPending,
}: {
  questions: RQuestion[];
  submitted: boolean;
  detail:    SubmitRes['detail'] | null;
  onSubmit:  (answers: number[]) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const getChoiceClass = (q: RQuestion, ci: number): string => {
    const base =
      'w-full rounded-xl px-4 py-3 text-left border font-pretendard text-[13px] transition-colors ';
    if (!submitted) {
      return (
        base +
        (answers[q.id] === ci
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-foreground'
          : 'border-[var(--border)] hover:border-[var(--accent)] text-foreground')
      );
    }
    const d = detail?.find((x) => x.question_id === q.id);
    if (ci === q.answer_index)
      return base + 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300';
    if (d && d.user_answer === ci && !d.correct)
      return base + 'border-red-400 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300';
    return base + 'border-[var(--border)] text-[var(--muted-foreground)]';
  };

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div key={q.id} className="space-y-3">
          <p className="font-sans-jp text-[15px] font-medium text-foreground leading-relaxed">
            <span className="font-pretendard text-[var(--muted-foreground)] mr-1">
              {qi + 1}.
            </span>
            {q.question_ja}
          </p>
          {q.question_ko !== q.question_ja && (
            <p className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
              {q.question_ko}
            </p>
          )}
          <ul role="radiogroup" className="space-y-2">
            {q.choices.map((choice, ci) => (
              <li key={ci}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={answers[q.id] === ci}
                  disabled={submitted}
                  onClick={() =>
                    !submitted && setAnswers((prev) => ({ ...prev, [q.id]: ci }))
                  }
                  className={getChoiceClass(q, ci)}
                >
                  <span className="font-mono text-[var(--muted-foreground)] mr-2">
                    {String.fromCharCode(0x2460 + ci)}
                  </span>
                  {choice}
                </button>
              </li>
            ))}
          </ul>

          {/* 해설 (제출 후) */}
          {submitted && q.explanation_ko && (
            <div className="rounded-lg bg-[var(--surface-alt)] border border-[var(--border)] px-4 py-3">
              <p className="font-pretendard text-[12px] font-semibold text-[var(--muted-foreground)] mb-1 uppercase tracking-wide">
                {t('reading.explain')}
              </p>
              <p className="font-pretendard text-[13px] text-foreground leading-relaxed">
                {q.explanation_ko}
              </p>
            </div>
          )}
        </div>
      ))}

      {!submitted && (
        <button
          type="button"
          disabled={!allAnswered || isPending}
          onClick={() => onSubmit(questions.map((q) => answers[q.id] ?? -1))}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-white
                     font-pretendard font-semibold text-[15px]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:opacity-90 transition-opacity"
        >
          {isPending ? t('common.submitting') : t('common.submit')}
        </button>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function ReadingDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { t } = useTranslation();

  const [showFurigana, setShowFurigana] = useState(true);
  const [mobileTab,    setMobileTab]   = useState<'text' | 'quiz'>('text');
  const [popover, setPopover] = useState<{ word: string; rect: DOMRect } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reading-detail', id],
    queryFn:  async () => {
      const res = await api.get<PassageFull>(`/reading/${id}`);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const submitMut = useMutation({
    mutationFn: (answers: number[]) =>
      api.post<SubmitRes>(`/reading/${id}/submit`, { answers }),
  });

  const handleWordTap = useCallback((word: string, rect: DOMRect) => {
    setPopover((prev) =>
      prev?.word === word ? null : { word, rect },
    );
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="font-pretendard text-[var(--muted-foreground)] text-sm">{t('common.loading')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="font-pretendard text-[var(--destructive)] text-sm">
          {t('reading.loadError')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/reading')}
          className="text-[var(--accent)] font-pretendard text-sm underline"
        >
          {t('reading.backToList')}
        </button>
      </div>
    );
  }

  const submitted  = submitMut.isSuccess;
  const resultData = submitMut.data?.ok ? submitMut.data.data : null;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="font-pretendard text-[13px] text-[var(--muted-foreground)]
                       hover:text-foreground mb-2 flex items-center gap-1"
          >
            ← {t('reading.back')}
          </button>
          <h1 className="font-sans-jp text-[24px] font-medium text-foreground leading-snug">
            {data.title_ja}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
              {data.level} · {t(`reading.genre.${data.genre}`)} · {t('reading.wordCount', { count: data.word_count })}
            </span>
          </div>
        </div>

        {/* 후리가나 토글 */}
        <button
          type="button"
          aria-pressed={showFurigana}
          onClick={() => setShowFurigana((v) => !v)}
          className={`shrink-0 px-3 py-1.5 rounded-full border font-pretendard text-[12px] font-medium
                      transition-colors ${
                        showFurigana
                          ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
        >
          振仮名
        </button>
      </div>

      {/* 결과 배너 */}
      {submitted && resultData && (
        <div className="mb-6 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)] p-4
                        flex items-center justify-between font-pretendard">
          <span className="font-semibold text-[var(--accent)] text-[15px]">
            {t('reading.resultSummary', {
              correct: resultData.correct,
              total: resultData.total,
              score: resultData.score,
            })}
          </span>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="text-[var(--accent)] text-[13px] underline"
          >
            {t('reading.otherPassages')}
          </button>
        </div>
      )}

      {/* 모바일 탭 */}
      <div className="flex lg:hidden mb-4 border-b border-[var(--border)]">
        {(['text', 'quiz'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 font-pretendard text-[14px] font-medium transition-colors ${
              mobileTab === tab
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--muted-foreground)]'
            }`}
          >
            {tab === 'text' ? t('reading.tabs.text') : t('reading.tabs.quiz')}
          </button>
        ))}
      </div>

      {/* 2열 레이아웃 (데스크탑) / 단일 패널 (모바일) */}
      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
        {/* ── 지문 패널 ──────────────────────────── */}
        <div className={mobileTab === 'text' ? 'block' : 'hidden lg:block'}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <PassageBody
              bodyJa={data.body_ja}
              showFurigana={showFurigana}
              onWordTap={handleWordTap}
            />

            {data.source_attribution && (
              <p className="mt-6 font-pretendard text-[11px] text-[var(--muted-foreground)] text-right">
                {t('reading.source', { source: data.source_attribution })}
              </p>
            )}
          </div>

          {/* 번역 (제출 후 공개) */}
          {submitted && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-6">
              <p className="font-pretendard text-[12px] font-semibold text-[var(--muted-foreground)] mb-3 uppercase tracking-wide">
                {t('reading.koreanTranslation')}
              </p>
              <p className="font-pretendard text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
                {data.body_ko}
              </p>
            </div>
          )}
        </div>

        {/* ── 문제 패널 ──────────────────────────── */}
        <div
          className={`lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto
                      ${mobileTab === 'quiz' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="font-serif-jp text-[20px] font-normal text-foreground mb-5">
              {t('reading.question')}
            </h2>
            {data.questions.length === 0 ? (
              <p className="font-pretendard text-sm text-[var(--muted-foreground)]">
                {t('reading.noQuestions')}
              </p>
            ) : (
              <QuestionsPanel
                questions={data.questions}
                submitted={submitted}
                detail={resultData?.detail ?? null}
                onSubmit={(answers) => submitMut.mutate(answers)}
                isPending={submitMut.isPending}
              />
            )}
          </div>
        </div>
      </div>

      {/* 팝오버 */}
      {popover && (
        <WordPopover
          word={popover.word}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
