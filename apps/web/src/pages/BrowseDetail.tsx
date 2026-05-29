/**
 * BrowseDetail — 어휘/문법/한자 단건 상세
 */
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVocabItem } from '../hooks/useVocab';
import { useGrammarItem, useKanjiItem } from '../hooks/useContent';
import { Badge, levelVariant } from '../components/ui/Badge';
import { Ruby } from '../components/ui/Ruby';
import { PronunciationButton } from '../components/feature/PronunciationButton';

type ContentType = 'vocab' | 'grammar' | 'kanji';

export default function BrowseDetail() {
  const { type = 'vocab', id } = useParams<{ type: ContentType; id: string }>();
  const { t } = useTranslation();
  const numId = Number(id);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link
        to={`/browse/${type}`}
        className="text-sm text-[var(--text-muted)] hover:text-primary transition-colors"
      >
        ← {t('browse.backToList')}
      </Link>
      {type === 'vocab'   && <VocabDetail id={numId} />}
      {type === 'grammar' && <GrammarDetail id={numId} />}
      {type === 'kanji'   && <KanjiDetail id={numId} />}
    </div>
  );
}

function VocabDetail({ id }: { id: number }) {
  const { t } = useTranslation();
  const { item, loading } = useVocabItem(id);
  if (loading) return <Skeleton />;
  if (!item) return <NotFound />;

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-4xl font-bold text-[var(--text-primary)]">
            <Ruby base={item.word} reading={item.reading ?? ''} />
          </h1>
          <Badge variant={levelVariant(item.level)}>{item.level.toUpperCase()}</Badge>
        </div>
        <p className="text-xl text-[var(--text-secondary)]">{item.meaning}</p>
      </header>

      <PronunciationButton text={item.reading || item.word} audioPath={item.audio_path} />

      {item.example_jp && (
        <section className="rounded-[var(--radius)] bg-[var(--muted)] p-4 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text-muted)]">{t('browse.example')}</p>
            <PronunciationButton compact text={item.example_jp} label={t('browse.playExamplePronunciation')} />
          </div>
          <p className="text-sm text-[var(--text-primary)]">{item.example_jp}</p>
          {item.example_ko && <p className="text-sm text-[var(--text-secondary)]">{item.example_ko}</p>}
        </section>
      )}
    </article>
  );
}

function GrammarDetail({ id }: { id: number }) {
  const { t } = useTranslation();
  const { item, loading } = useGrammarItem(id);
  if (loading) return <Skeleton />;
  if (!item) return <NotFound />;

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{item.pattern}</h1>
          <Badge variant={levelVariant(item.level)}>{item.level.toUpperCase()}</Badge>
        </div>
        <p className="text-lg text-[var(--text-secondary)]">{item.meaning}</p>
      </header>
      {item.structure && (
        <p className="text-sm text-[var(--text-primary)]">{item.structure}</p>
      )}
      {item.notes && (
        <p className="text-sm text-[var(--text-secondary)]">{item.notes}</p>
      )}
      {item.example_jp && (
        <section className="rounded-[var(--radius)] bg-[var(--muted)] p-4 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[var(--text-primary)]">{item.example_jp}</p>
            <PronunciationButton compact text={item.example_jp} label={t('browse.playExamplePronunciation')} />
          </div>
          {item.example_ko && <p className="text-sm text-[var(--text-secondary)]">{item.example_ko}</p>}
        </section>
      )}
    </article>
  );
}

function KanjiDetail({ id }: { id: number }) {
  const { t } = useTranslation();
  const { item, loading } = useKanjiItem(id);
  if (loading) return <Skeleton />;
  if (!item) return <NotFound />;

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-6xl font-bold text-[var(--text-primary)]">{item.character}</h1>
          <Badge variant={levelVariant(item.level)}>{item.level.toUpperCase()}</Badge>
        </div>
        <p className="text-lg text-[var(--text-secondary)]">{item.meaning}</p>
      </header>
      <PronunciationButton
        text={item.reading_on || item.reading_kun || item.character}
        audioPath={item.audio_path}
      />
      <dl className="space-y-2 text-sm">
        {item.reading_on && (
          <div className="flex gap-3">
            <dt className="font-medium text-[var(--text-muted)] w-20 shrink-0">{t('browse.onyomi')}</dt>
            <dd className="text-[var(--text-primary)]">{item.reading_on}</dd>
          </div>
        )}
        {item.reading_kun && (
          <div className="flex gap-3">
            <dt className="font-medium text-[var(--text-muted)] w-20 shrink-0">{t('browse.kunyomi')}</dt>
            <dd className="text-[var(--text-primary)]">{item.reading_kun}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function Skeleton() {
  return <div className="h-32 rounded-[var(--radius)] bg-[var(--muted)] animate-pulse" />;
}
function NotFound() {
  const { t } = useTranslation();
  return <p className="text-[var(--text-muted)]">{t('browse.itemNotFound')}</p>;
}
