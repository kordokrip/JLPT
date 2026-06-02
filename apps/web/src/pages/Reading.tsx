/**
 * Reading.tsx — Phase 8-D: 독해 지문 목록 페이지
 *
 * Route: /reading
 *
 * 기능:
 *  - level (N3/N4/N5) + genre 필터
 *  - 무한 스크롤 (cursor 기반)
 *  - 카드 클릭 → /reading/:id
 */
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type Level = 'N5' | 'N4' | 'N3' | 'N2';
type Genre = 'email' | 'ad' | 'essay' | 'news' | 'instruction' | 'conversation' | 'notice' | '';

interface PassageItem {
  id:         number;
  level:      Level;
  genre:      Genre;
  title_ja:   string;
  word_count: number;
  created_at: number;
}

interface PassageListRes {
  items:  PassageItem[];
  cursor: string | null;
}

const LEVELS: Array<{ v: Level | '' }> = [
  { v: '' },
  { v: 'N5' },
  { v: 'N4' },
  { v: 'N3' },
  { v: 'N2' },
];

const GENRES: Array<{ v: Genre | ''; key: string; icon: string }> = [
  { v: '',             key: 'all',          icon: '📚' },
  { v: 'email',        key: 'email',        icon: '✉️' },
  { v: 'ad',           key: 'ad',           icon: '📢' },
  { v: 'essay',        key: 'essay',        icon: '📝' },
  { v: 'news',         key: 'news',         icon: '📰' },
  { v: 'instruction',  key: 'instruction',  icon: '📋' },
  { v: 'conversation', key: 'conversation', icon: '💬' },
  { v: 'notice',       key: 'notice',       icon: '📌' },
];

const LEVEL_COLORS: Record<Level, string> = {
  N5: 'bg-green-100  text-green-700  dark:bg-green-900  dark:text-green-300',
  N4: 'bg-blue-100   text-blue-700   dark:bg-blue-900   dark:text-blue-300',
  N3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  N2: 'bg-red-100    text-red-700    dark:bg-red-900    dark:text-red-300',
};

export default function Reading() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [level, setLevel] = useState<Level | ''>('');
  const [genre, setGenre] = useState<Genre | ''>('');

  const fetchPage = useCallback(
    async ({ pageParam }: { pageParam: string | null }): Promise<PassageListRes> => {
      const res = await api.get<PassageListRes>(
        '/reading',
        Object.fromEntries([
          ...(level  ? [['level',  level ]] : []),
          ...(genre  ? [['genre',  genre ]] : []),
          ...(pageParam ? [['cursor', pageParam]] : []),
        ]),
      );
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    [level, genre],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey:          ['reading-list', level, genre],
    queryFn:           fetchPage,
    initialPageParam:  null as string | null,
    getNextPageParam:  (last: PassageListRes) => last.cursor ?? undefined,
  });

  // 무한 스크롤 감지
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (el: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!el) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(el);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-[768px] space-y-6 px-4 py-8 pb-28">
      {/* 헤더 */}
      <div>
        <h1 className="font-serif-jp text-[40px] font-normal text-foreground leading-none mb-1">
          {t('reading.title')}
        </h1>
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)]">
          {t('reading.subtitle')}
        </p>
      </div>

      {/* 레벨 필터 */}
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map(({ v }) => (
          <button
            key={v || 'all'}
            type="button"
            onClick={() => setLevel(v)}
            className={`min-h-11 rounded-full border px-4 font-pretendard text-sm font-medium transition-colors ${
              level === v
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-foreground hover:border-[var(--accent)]'
            }`}
          >
            {v || t('common.all')}
          </button>
        ))}
      </div>

      {/* 장르 필터 */}
      <div className="flex gap-2 flex-wrap">
        {GENRES.map(({ v, key, icon }) => (
          <button
            key={v || 'all'}
            type="button"
            onClick={() => setGenre(v)}
            className={`flex min-h-11 items-center gap-1 rounded-full border px-4 font-pretendard text-sm transition-colors ${
              genre === v
                ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]'
            }`}
          >
            <span aria-hidden="true">{icon}</span>
            {t(`reading.genre.${key}`)}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] p-5 animate-pulse">
              <div className="h-4 w-16 bg-[var(--surface-alt)] rounded mb-3" />
              <div className="h-5 w-full bg-[var(--surface-alt)] rounded mb-2" />
              <div className="h-3 w-20 bg-[var(--surface-alt)] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <p className="text-[var(--destructive)] font-pretendard text-sm">
          {t('reading.loadError')}
        </p>
      )}

      {/* 지문 카드 목록 */}
      {!isLoading && allItems.length === 0 && !error && (
        <p className="text-center text-[var(--muted-foreground)] font-pretendard text-sm py-12">
          {t('reading.emptyFiltered')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allItems.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate(`/reading/${p.id}`)}
            className="card-hairline rounded-xl p-5 text-left hover:border-[var(--accent)]
                       transition-colors group focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-pretendard font-bold ${
                  LEVEL_COLORS[p.level] ?? ''
                }`}
              >
                {p.level}
              </span>
              <span className="font-pretendard text-[11px] text-[var(--muted-foreground)] capitalize">
                {t(`reading.genre.${GENRES.find((g) => g.v === p.genre)?.key ?? 'all'}`)}
              </span>
            </div>
            <p className="font-sans-jp text-[16px] font-medium text-foreground leading-snug
                          group-hover:text-[var(--accent)] transition-colors line-clamp-2">
              {p.title_ja}
            </p>
            <p className="font-pretendard text-[11px] text-[var(--muted-foreground)] mt-2">
              {t('reading.wordCount', { count: p.word_count })}
            </p>
          </button>
        ))}
      </div>

      {/* 무한 스크롤 센티넬 */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <p className="text-center font-pretendard text-[13px] text-[var(--muted-foreground)]">
          {t('reading.loadingMore')}
        </p>
      )}
    </div>
  );
}
