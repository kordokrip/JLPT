import { useTranslation } from 'react-i18next';
import { BROWSE_TABS } from './types';
import type { ContentType } from './types';
import type { JlptLevel } from '@nihongo-n3/shared';

export function BrowseSidebar({
  currentType,
  level,
  levels,
  onType,
  onLevel,
}: {
  currentType: ContentType;
  level: JlptLevel | undefined;
  levels: readonly JlptLevel[];
  onType: (type: ContentType) => void;
  onLevel: (level: JlptLevel | undefined) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-[0.5px] border-[var(--border)] bg-[var(--surface-alt)] p-5 lg:block">
      <h2 className="mb-5 text-base font-semibold">{t('browse.category')}</h2>
      <div className="mb-8 space-y-1">
        {BROWSE_TABS.map(({ key }) => (
          <button
            key={key}
            onClick={() => onType(key)}
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
      <div className="pt-6 border-t border-[0.5px] border-[var(--border)]">
        <h3 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">{t('browse.level')}</h3>
        <div className="space-y-1">
          <button
            onClick={() => onLevel(undefined)}
            className={`touch-target w-full rounded-[var(--radius-md)] px-3 text-left text-sm font-medium transition-colors ${
              !level ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
            }`}
          >
            {t('common.all')}
          </button>
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => onLevel(level === l ? undefined : l)}
              className={`touch-target flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors ${
                level === l ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-accent-soft-30'
              }`}
            >
              <span>{t(`levels.${l}`)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileBrowseTabs({ currentType, onType }: { currentType: ContentType; onType: (type: ContentType) => void }) {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--surface-glass)] p-1 backdrop-blur lg:hidden">
      {BROWSE_TABS.map(({ key }) => (
        <button
          key={key}
          onClick={() => onType(key)}
          className={`touch-target min-w-20 rounded-[var(--radius-sm)] px-3 text-sm font-semibold transition-colors ${
            currentType === key ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-accent-soft-20'
          }`}
        >
          {t(`browse.${key}`)}
        </button>
      ))}
    </div>
  );
}

export function MobileLevelFilters({
  level,
  levels,
  onLevel,
}: {
  level: JlptLevel | undefined;
  levels: readonly JlptLevel[];
  onLevel: (level: JlptLevel | undefined) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      <FilterChip active={!level} onClick={() => onLevel(undefined)} label={t('common.all')} />
      {levels.map((l) => (
        <FilterChip key={l} active={level === l} onClick={() => onLevel(level === l ? undefined : l)} label={t(`levels.${l}`)} />
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
