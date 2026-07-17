import { useTranslation } from 'react-i18next';
import { NaturalJapaneseSearch } from '../../components/feature/NaturalJapaneseSearch';
import type { HomophonePairItem } from '../../lib/api';
import type { GrammarItem, KanjiItem, VocabItem } from '../../lib/db';
import { BrowseSidebar, MobileBrowseTabs, MobileLevelFilters } from './BrowseFilters';
import { BrowseList, LoadingList } from './BrowseList';
import type { ContentType } from './types';
import type { JlptLevel } from '@nihongo-n3/shared';

type BrowseViewProps = {
  currentType: ContentType;
  query: string;
  level: JlptLevel | undefined;
  items: Array<VocabItem | GrammarItem | KanjiItem | HomophonePairItem>;
  loading: boolean;
  onType: (type: ContentType) => void;
  onLevel: (level: JlptLevel | undefined) => void;
  onQuery: (value: string) => void;
};

export function BrowseView({
  currentType,
  query,
  level,
  items,
  loading,
  onType,
  onLevel,
  onQuery,
}: BrowseViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-[calc(100dvh-var(--nav-height))]">
      <BrowseSidebar currentType={currentType} level={level} onType={onType} onLevel={onLevel} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] px-4 py-5 pb-28 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-5">
            <h1 className="mb-2 font-serif-jp text-[var(--text-2xl)] font-normal leading-tight text-foreground">
              {t(`browse.titleByType.${currentType}`)}
            </h1>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p data-visual-dynamic className="text-sm text-[var(--muted-foreground)]">
                {level ? t('browse.levelLabel', { level }) : t('browse.allLevels')} · {t('common.itemsCount', { count: items.length })}
              </p>
              <MobileBrowseTabs currentType={currentType} onType={onType} />
            </div>
          </div>

          {currentType === 'homophones' ? (
            <div className="surface-card mb-4 p-4 shadow-none">
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {t('browse.homophoneIntro')}
              </p>
              <MobileLevelFilters level={level} onLevel={onLevel} />
            </div>
          ) : (
            <div className="surface-card mb-4 p-3 shadow-none">
              <input
                type="search"
                placeholder={t('browse.searchPlaceholder')}
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                aria-label={t('browse.ariaSearch', { type: t(`browse.${currentType}`) })}
                className="h-12 w-full rounded-[var(--radius-md)] border-[0.5px] border-[var(--border)] bg-[var(--input-bg)] px-4 text-base text-foreground outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
              <MobileLevelFilters level={level} onLevel={onLevel} />
            </div>
          )}

          {currentType === 'vocab' && <NaturalJapaneseSearch onUse={onQuery} />}

          {loading ? (
            <LoadingList />
          ) : items.length === 0 ? (
            <div className="surface-panel py-16 text-center text-sm text-[var(--muted-foreground)]">
              {t('browse.noResult')}
            </div>
          ) : (
            <BrowseList currentType={currentType} items={items} />
          )}

          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}
