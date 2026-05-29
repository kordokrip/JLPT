/**
 * Browse — 어휘 / 문법 / 한자 목록 + 검색
 * Figma Make 디자인 적용 + 실제 API 데이터 연결
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVocabList, useVocabSearch } from '../hooks/useVocab';
import { useGrammarList, useKanjiList } from '../hooks/useContent';
import { levelVariant } from '../components/ui/Badge';
import { PronunciationButton } from '../components/feature/PronunciationButton';
import type { GrammarItem, KanjiItem, VocabItem } from '../lib/db';

type ContentType = 'vocab' | 'grammar' | 'kanji';
const TABS: { key: ContentType }[] = [{ key: 'vocab' }, { key: 'grammar' }, { key: 'kanji' }];
const LEVELS = ['N5', 'N4', 'N3'];

export default function Browse() {
  const { type = 'vocab' } = useParams<{ type: ContentType }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery]   = useState('');
  const [level, setLevel]   = useState<string | undefined>(undefined);

  const vocabList   = useVocabList(level, 200);
  const grammarList = useGrammarList(level, 200);
  const kanjiList   = useKanjiList(level, 200);
  const vocabSearch = useVocabSearch(query);

  const currentType = (['vocab', 'grammar', 'kanji'].includes(type) ? type : 'vocab') as ContentType;

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
    <div className="h-full flex">
      {/* ── 좌측 카테고리 패널 (md 이상) ── */}
      <div className="hidden md:block w-[280px] border-r border-[0.5px] border-[var(--border)] p-6 overflow-y-auto shrink-0">
        <h2 className="font-sans-jp text-[15px] font-medium mb-6">{t('browse.category')}</h2>

        {/* 탭 */}
        <div className="space-y-1 mb-8">
          {TABS.map(({ key }) => (
            <button
              key={key}
              onClick={() => { navigate(`/browse/${key}`); setLevel(undefined); setQuery(''); }}
              className={`w-full flex items-center justify-between py-2 px-3 rounded transition-colors ${
                currentType === key
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-l-2 border-[var(--accent)] pl-2'
                  : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
              }`}
            >
              <span className="font-sans-jp text-[13px] font-medium">{t(`browse.${key}`)}</span>
              <span className="text-[11px] font-pretendard text-[var(--muted-foreground)]">{key}</span>
            </button>
          ))}
        </div>

        {/* 레벨 필터 */}
        <div className="pt-6 border-t border-[0.5px] border-[var(--border)]">
          <h3 className="font-sans-jp text-[13px] text-[var(--muted-foreground)] mb-3">{t('browse.level')}</h3>
          <div className="space-y-1">
            <button
              onClick={() => setLevel(undefined)}
              className={`w-full text-left py-2 px-3 rounded text-[13px] font-sans-jp transition-colors ${
                !level ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
              }`}
            >
              {t('common.all')}
            </button>
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(level === l ? undefined : l)}
                className={`w-full flex items-center justify-between py-2 px-3 rounded text-[13px] font-sans-jp transition-colors ${
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
        <div className="max-w-[720px] mx-auto px-6 lg:px-12 py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="font-serif-jp text-[36px] font-normal text-foreground leading-none mb-2">
              {t(`browse.titleByType.${currentType}`)}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {level ? t('browse.levelLabel', { level }) : t('browse.allLevels')} · {t('common.itemsCount', { count: items.length })}
              </p>
              {/* 모바일 탭 */}
              <div className="flex gap-1 md:hidden">
                {TABS.map(({ key }) => (
                  <button
                    key={key}
                    onClick={() => navigate(`/browse/${key}`)}
                    className={`px-2 py-0.5 rounded text-[11px] font-sans-jp transition-colors ${
                      currentType === key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {t(`browse.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 검색 */}
          <div className="relative mb-6">
            <input
              type="search"
              placeholder={t('browse.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('browse.ariaSearch', { type: t(`browse.${currentType}`) })}
              className="w-full border-[0.5px] border-[var(--border)] rounded-lg px-4 py-2.5 text-[14px] font-sans-jp bg-card text-foreground placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* 목록 */}
          {loading ? (
            <LoadingList />
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted-foreground)] font-sans-jp text-[14px]">
              {t('browse.noResult')}
            </div>
          ) : (
            <ul role="list" className="space-y-3">
              {currentType === 'vocab'
                ? (items as VocabItem[]).map((item) => (
                    <li key={item.id} role="listitem">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.word} — ${item.meaning}`}
                      onClick={() => navigate(`/browse/vocab/${item.id}`)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/browse/vocab/${item.id}`)}
                      className="card-hairline rounded-lg p-5 hover:border-[var(--accent)]/30 transition-all cursor-pointer hover-lift"
                    >
                      <div className="flex items-start gap-5">
                        <div className="flex-shrink-0">
                          <div className="font-serif-jp text-[28px] font-normal text-foreground">
                            {item.word}
                          </div>
                          <div className="font-sans-jp text-[12px] text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1.5">
                            <span>{item.reading}</span>
                            <PronunciationButton
                              compact
                              text={item.reading || item.word}
                              audioPath={item.audio_path}
                              label={`${item.word} ${t('browse.playPronunciation')}`}
                              className="h-6 w-6 border-0 bg-transparent p-0"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-pretendard text-[14px] text-foreground">{item.meaning}</span>
                            {item.part_of_speech && (
                              <span className="px-2 py-0.5 border border-[var(--border)] rounded text-[10px] text-[var(--muted-foreground)] font-sans-jp">
                                {item.part_of_speech}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              levelVariant(item.level ?? 'n3').includes('n3') ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : levelVariant(item.level ?? 'n3').includes('n4') ? 'bg-blue-50 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                              {(item.level ?? 'N3').toUpperCase()}
                            </span>
                          </div>
                          {item.example_jp && (
                            <p className="font-sans-jp text-[12px] text-[var(--muted-foreground)]">
                              {t('browse.example')}: {item.example_jp}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    </li>
                  ))
                : (items as Array<GrammarItem | KanjiItem>).map((item) => (
                    <li key={item.id} role="listitem">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={'character' in item ? item.character : item.pattern}
                      onClick={() => navigate(`/browse/${currentType}/${item.id}`)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/browse/${currentType}/${item.id}`)}
                      className="card-hairline rounded-lg p-5 hover:border-[var(--accent)]/30 transition-all cursor-pointer hover-lift"
                    >
                      {currentType === 'kanji' ? (
                        <div className="flex items-start gap-5">
                          <div className="font-serif-jp text-[40px] font-normal text-foreground flex-shrink-0 flex items-center gap-2">
                            {(item as KanjiItem).character}
                            <PronunciationButton
                              compact
                              text={(item as KanjiItem).reading_on || (item as KanjiItem).reading_kun || (item as KanjiItem).character}
                              audioPath={(item as KanjiItem).audio_path}
                              label={`${(item as KanjiItem).character} ${t('browse.playPronunciation')}`}
                              className="h-7 w-7 text-[var(--muted-foreground)]"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-pretendard text-[14px] text-foreground">{item.meaning}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]`}>
                                {(item.level ?? 'N3').toUpperCase()}
                              </span>
                            </div>
                            <div className="font-sans-jp text-[12px] text-[var(--muted-foreground)]">
                              {(item as KanjiItem).reading_on && <span>{t('browse.onyomi')}: {(item as KanjiItem).reading_on}　</span>}
                              {(item as KanjiItem).reading_kun && <span>{t('browse.kunyomi')}: {(item as KanjiItem).reading_kun}</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-sans-jp text-[15px] font-medium text-foreground">{(item as GrammarItem).pattern}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]`}>
                              {(item.level ?? 'N3').toUpperCase()}
                            </span>
                          </div>
                          <p className="font-pretendard text-[13px] text-[var(--muted-foreground)]">
                            {item.meaning}
                          </p>
                        </div>
                      )}
                    </div>
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
        <div key={i} className="card-hairline rounded-lg p-5 animate-pulse">
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
