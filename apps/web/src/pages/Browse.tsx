/**
 * Browse — 어휘 / 문법 / 한자 목록 + 검색
 * Figma Make 디자인 적용 + 실제 API 데이터 연결
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVocabList, useVocabSearch } from '../hooks/useVocab';
import { useGrammarList, useKanjiList } from '../hooks/useContent';
import { levelVariant } from '../components/ui/Badge';
import { PronunciationButton } from '../components/feature/PronunciationButton';
import { NaturalJapaneseSearch } from '../components/feature/NaturalJapaneseSearch';
import type { GrammarItem, KanjiItem, VocabItem } from '../lib/db';

type ContentType = 'vocab' | 'grammar' | 'kanji';
const TABS: { key: ContentType }[] = [{ key: 'vocab' }, { key: 'grammar' }, { key: 'kanji' }];
const LEVELS = ['N5', 'N4', 'N3'];

export default function Browse() {
  const { type = 'vocab' } = useParams<{ type: ContentType }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [query, setQuery]   = useState(() => searchParams.get('q') ?? searchParams.get('text') ?? '');
  const [level, setLevel]   = useState<string | undefined>(undefined);

  const vocabList   = useVocabList(level, 200);
  const grammarList = useGrammarList(level, 200);
  const kanjiList   = useKanjiList(level, 200);
  const vocabSearch = useVocabSearch(query);

  const currentType = (['vocab', 'grammar', 'kanji'].includes(type) ? type : 'vocab') as ContentType;

  useEffect(() => {
    setQuery(searchParams.get('q') ?? searchParams.get('text') ?? '');
  }, [searchParams]);

  function updateQuery(value: string) {
    setQuery(value);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value.trim()) {
        next.set('q', value);
      } else {
        next.delete('q');
        next.delete('text');
      }
      return next;
    }, { replace: true });
  }

  function switchType(nextType: ContentType) {
    navigate(`/browse/${nextType}`);
    setLevel(undefined);
    setQuery('');
  }

  const items =
    query.trim().length >= 1 && currentType === 'vocab'
      ? (vocabSearch.data ?? [])
      : currentType === 'vocab'   ? vocabList.items
      : currentType === 'grammar' ? grammarList.items
      : kanjiList.items;

  const loading =
    currentType === 'vocab'   ? vocabList.loading :
    currentType === 'grammar' ? grammarList.loading : kanjiList.loading;

  return (
    <div className="flex h-full min-h-[calc(100dvh-var(--nav-height))]">
      {/* ── 좌측 카테고리 패널 (md 이상) ── */}
      <div className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-[0.5px] border-[var(--border)] bg-[var(--surface-alt)] p-5 lg:block">
        <h2 className="mb-5 text-base font-semibold">{t('browse.category')}</h2>

        {/* 탭 */}
        <div className="mb-8 space-y-1">
          {TABS.map(({ key }) => (
            <button
              key={key}
              onClick={() => switchType(key)}
              className={`touch-target flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 text-left transition-colors ${
                currentType === key
                  ? 'border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] pl-2 text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
              }`}
            >
              <span className="text-sm font-semibold">{t(`browse.${key}`)}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{key}</span>
            </button>
          ))}
        </div>

        {/* 레벨 필터 */}
        <div className="pt-6 border-t border-[0.5px] border-[var(--border)]">
          <h3 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">{t('browse.level')}</h3>
          <div className="space-y-1">
            <button
              onClick={() => setLevel(undefined)}
              className={`touch-target w-full rounded-[var(--radius-md)] px-3 text-left text-sm font-medium transition-colors ${
                !level ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
              }`}
            >
              {t('common.all')}
            </button>
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(level === l ? undefined : l)}
                className={`touch-target flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors ${
                  level === l ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
                }`}
              >
                <span>{l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] px-4 py-5 pb-28 sm:px-6 lg:px-10 lg:py-8">

          {/* 헤더 */}
          <div className="mb-5">
            <h1 className="mb-2 font-serif-jp text-[var(--text-2xl)] font-normal leading-tight text-foreground">
              {t(`browse.titleByType.${currentType}`)}
            </h1>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p data-visual-dynamic className="text-sm text-[var(--muted-foreground)]">
                {level ? t('browse.levelLabel', { level }) : t('browse.allLevels')} · {t('common.itemsCount', { count: items.length })}
              </p>
              {/* 모바일 탭 */}
              <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--surface-glass)] p-1 backdrop-blur lg:hidden">
                {TABS.map(({ key }) => (
                  <button
                    key={key}
                    onClick={() => switchType(key)}
                    className={`touch-target min-w-20 rounded-[var(--radius-sm)] px-3 text-sm font-semibold transition-colors ${
                      currentType === key ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-accent-soft-20'
                    }`}
                  >
                    {t(`browse.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 검색 */}
          <div className="surface-card mb-4 p-3 shadow-none">
            <input
              type="search"
              placeholder={t('browse.searchPlaceholder')}
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              aria-label={t('browse.ariaSearch', { type: t(`browse.${currentType}`) })}
              className="h-12 w-full rounded-[var(--radius-md)] border-[0.5px] border-[var(--border)] bg-[var(--input-bg)] px-4 text-base text-foreground outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              <FilterChip active={!level} onClick={() => setLevel(undefined)} label={t('common.all')} />
              {LEVELS.map((l) => (
                <FilterChip key={l} active={level === l} onClick={() => setLevel(level === l ? undefined : l)} label={l} />
              ))}
            </div>
          </div>

          {currentType === 'vocab' && <NaturalJapaneseSearch onUse={updateQuery} />}

          {/* 목록 */}
          {loading ? (
            <LoadingList />
          ) : items.length === 0 ? (
            <div className="surface-panel py-16 text-center text-sm text-[var(--muted-foreground)]">
              {t('browse.noResult')}
            </div>
          ) : (
            <ul role="list" className="space-y-3">
              {currentType === 'vocab'
                ? (items as VocabItem[]).map((item) => (
                    <li key={item.id} role="listitem">
                      <article className="surface-card p-4 shadow-none transition-all hover-lift sm:p-5">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            aria-label={`${item.word} — ${item.meaning}`}
                            onClick={() => navigate(`/browse/vocab/${item.id}`)}
                            className="min-h-11 min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                              <div className="min-w-0 flex-shrink-0 sm:w-44">
                                <div className="break-all font-serif-jp text-[var(--text-xl)] font-normal leading-tight text-foreground">
                                  {item.word}
                                </div>
                                <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                                  {item.reading}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="text-base font-semibold text-foreground">{item.meaning}</span>
                                  {item.part_of_speech && (
                                    <span className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                                      {item.part_of_speech}
                                    </span>
                                  )}
                                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    levelVariant(item.level ?? 'n3').includes('n3') ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                                    : levelVariant(item.level ?? 'n3').includes('n4') ? 'bg-blue-50 text-blue-600'
                                    : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {(item.level ?? 'N3').toUpperCase()}
                                  </span>
                                </div>
                                {item.example_jp && (
                                  <p className="font-sans-jp text-sm leading-6 text-[var(--muted-foreground)]">
                                    {t('browse.example')}: {item.example_jp}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="shrink-0">
                            <PronunciationButton
                              compact
                              text={item.reading || item.word}
                              audioPath={item.audio_path}
                              label={`${item.word} ${t('browse.playPronunciation')}`}
                              className="border-0 bg-transparent p-0"
                            />
                          </div>
                        </div>
                      </article>
                    </li>
                  ))
                : (items as Array<GrammarItem | KanjiItem>).map((item) => (
                    <li key={item.id} role="listitem">
                      <article className="surface-card p-4 shadow-none transition-all hover-lift sm:p-5">
                        {currentType === 'kanji' ? (
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              aria-label={(item as KanjiItem).character}
                              onClick={() => navigate(`/browse/${currentType}/${item.id}`)}
                              className="flex min-h-11 min-w-0 flex-1 items-start gap-5 text-left"
                            >
                              <div className="flex-shrink-0 font-serif-jp text-[var(--text-2xl)] font-normal text-foreground">
                                {(item as KanjiItem).character}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base font-semibold text-foreground">{item.meaning}</span>
                                  <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                                    {(item.level ?? 'N3').toUpperCase()}
                                  </span>
                                </div>
                                <div className="font-sans-jp text-sm leading-6 text-[var(--muted-foreground)]">
                                  {(item as KanjiItem).reading_on && <span>{t('browse.onyomi')}: {(item as KanjiItem).reading_on}　</span>}
                                  {(item as KanjiItem).reading_kun && <span>{t('browse.kunyomi')}: {(item as KanjiItem).reading_kun}</span>}
                                </div>
                              </div>
                            </button>
                            <div className="shrink-0">
                              <PronunciationButton
                                compact
                                text={(item as KanjiItem).reading_on || (item as KanjiItem).reading_kun || (item as KanjiItem).character}
                                audioPath={(item as KanjiItem).audio_path}
                                label={`${(item as KanjiItem).character} ${t('browse.playPronunciation')}`}
                                className="text-[var(--muted-foreground)]"
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label={(item as GrammarItem).pattern}
                            onClick={() => navigate(`/browse/${currentType}/${item.id}`)}
                            className="min-h-11 w-full text-left"
                          >
                            <div className="mb-1.5 flex items-center gap-2">
                              <span className="font-sans-jp text-base font-semibold text-foreground">{(item as GrammarItem).pattern}</span>
                              <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                                {(item.level ?? 'N3').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                              {item.meaning}
                            </p>
                          </button>
                        )}
                      </article>
                    </li>
                  ))}
            </ul>
          )}

          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface-card animate-pulse p-5 shadow-none">
          <div className="flex items-start gap-5">
            <div className="w-14 h-8 bg-[var(--border)] rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--border)] rounded w-1/3" />
              <div className="h-3 bg-[var(--border)] rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'border border-[var(--border)] bg-card text-[var(--muted-foreground)]'
      }`}
    >
      {label}
    </button>
  );
}
