import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PronunciationButton } from '../../components/feature/PronunciationButton';
import { Badge, levelVariant } from '../../components/ui/Badge';
import type { HomophonePairItem } from '../../lib/api';
import type { GrammarItem, KanjiItem, VocabItem } from '../../lib/db';
import type { ContentType } from './types';
import { DEFAULT_JLPT_LEVEL } from '@nihongo-n3/shared';

export function BrowseList({
  currentType,
  items,
}: {
  currentType: ContentType;
  items: Array<VocabItem | GrammarItem | KanjiItem | HomophonePairItem>;
}) {
  const navigate = useNavigate();

  if (currentType === 'homophones') {
    return <HomophoneList items={items as HomophonePairItem[]} />;
  }

  if (currentType === 'vocab') {
    return (
      <ul role="list" className="space-y-3">
        {(items as VocabItem[]).map((item) => (
          <VocabListItem key={item.id} item={item} onOpen={() => navigate(`/browse/vocab/${item.id}`)} />
        ))}
      </ul>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {(items as Array<GrammarItem | KanjiItem>).map((item) => (
        <li key={item.id} role="listitem">
          <article className="surface-card p-4 shadow-none transition-all hover-lift sm:p-5">
            {currentType === 'kanji'
              ? <KanjiListItem item={item as KanjiItem} onOpen={() => navigate(`/browse/${currentType}/${item.id}`)} />
              : <GrammarListItem item={item as GrammarItem} onOpen={() => navigate(`/browse/${currentType}/${item.id}`)} />}
          </article>
        </li>
      ))}
    </ul>
  );
}

function HomophoneList({ items }: { items: HomophonePairItem[] }) {
  const { t } = useTranslation();
  return (
    <ul role="list" className="space-y-3">
      {items.map((item) => (
        <li key={item.id} role="listitem">
          <article className="surface-card p-4 shadow-none sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif-jp text-[var(--text-xl)] leading-tight text-foreground">
                  {item.reading}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{item.note_ko}</p>
              </div>
              <PronunciationButton
                compact
                text={item.reading}
                surface="vocab"
                label={`${item.reading} ${t('browse.playPronunciation')}`}
                className="shrink-0 border-0 bg-transparent p-0"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <HomophoneWord
                word={item.word_a}
                accent={item.accent.word_a}
                example={item.examples.word_a}
                labels={{ accent: t('browse.accent'), source: t('browse.source') }}
              />
              <HomophoneWord
                word={item.word_b}
                accent={item.accent.word_b}
                example={item.examples.word_b}
                labels={{ accent: t('browse.accent'), source: t('browse.source') }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">
              <span>{t('browse.accent')}: {item.accent.source}</span>
              <span>{t('browse.reviewed')}: {item.review.reviewed_at}</span>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function HomophoneWord({
  word,
  accent,
  example,
  labels,
}: {
  word: HomophonePairItem['word_a'];
  accent: string;
  example: HomophonePairItem['examples']['word_a'];
  labels: { accent: string; source: string };
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-alt)] p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-serif-jp text-[var(--text-xl)] text-foreground">{word.word}</span>
        <span className="text-sm text-[var(--muted-foreground)]">{word.meaning}</span>
        <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
          {word.level}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">{labels.accent}: {accent}</p>
      <p className="mt-2 font-sans-jp text-sm leading-6 text-foreground">{example.ja}</p>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">{example.ko}</p>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        {labels.source}: {word.source.code} · {word.source.version}
      </p>
    </section>
  );
}

function VocabListItem({ item, onOpen }: { item: VocabItem; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <li role="listitem">
      <article className="surface-card p-4 shadow-none transition-all hover-lift sm:p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={`${item.word} — ${item.meaning}`}
            onClick={onOpen}
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
                  <Badge variant={levelVariant(item.level ?? DEFAULT_JLPT_LEVEL)}>
                    {(item.level ?? DEFAULT_JLPT_LEVEL).toUpperCase()}
                  </Badge>
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
              surface="vocab"
              label={`${item.word} ${t('browse.playPronunciation')}`}
              className="border-0 bg-transparent p-0"
            />
          </div>
        </div>
      </article>
    </li>
  );
}

function KanjiListItem({ item, onOpen }: { item: KanjiItem; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        aria-label={item.character}
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 items-start gap-5 text-left"
      >
        <div className="flex-shrink-0 font-serif-jp text-[var(--text-2xl)] font-normal text-foreground">
          {item.character}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-semibold text-foreground">{item.meaning}</span>
            <Badge variant={levelVariant(item.level ?? DEFAULT_JLPT_LEVEL)}>
              {(item.level ?? DEFAULT_JLPT_LEVEL).toUpperCase()}
            </Badge>
          </div>
          <div className="font-sans-jp text-sm leading-6 text-[var(--muted-foreground)]">
            {item.reading_on && <span>{t('browse.onyomi')}: {item.reading_on}　</span>}
            {item.reading_kun && <span>{t('browse.kunyomi')}: {item.reading_kun}</span>}
          </div>
        </div>
      </button>
      <div className="shrink-0">
        <PronunciationButton
          compact
          text={item.reading_on || item.reading_kun || item.character}
          surface="kanji"
          label={`${item.character} ${t('browse.playPronunciation')}`}
          className="text-[var(--muted-foreground)]"
        />
      </div>
    </div>
  );
}

function GrammarListItem({ item, onOpen }: { item: GrammarItem; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        aria-label={item.pattern}
        onClick={onOpen}
        className="min-h-11 min-w-0 flex-1 text-left"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-sans-jp text-base font-semibold text-foreground">{item.pattern}</span>
          <Badge variant={levelVariant(item.level ?? DEFAULT_JLPT_LEVEL)}>
            {(item.level ?? DEFAULT_JLPT_LEVEL).toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {item.meaning}
        </p>
      </button>
      <PronunciationButton
        compact
        text={item.example_jp || item.pattern}
        surface="example"
        label={`${item.pattern} ${t('browse.playPronunciation')}`}
        className="shrink-0 border-0 bg-transparent p-0"
      />
    </div>
  );
}

export function LoadingList() {
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
