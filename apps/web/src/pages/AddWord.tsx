import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';

function normalizeSharedText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export default function AddWord() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialText = useMemo(() => {
    const shared = [
      searchParams.get('text'),
      searchParams.get('title'),
      searchParams.get('url'),
    ]
      .filter(Boolean)
      .join(' ');
    return normalizeSharedText(shared);
  }, [searchParams]);
  const [query, setQuery] = useState(initialText);
  const target = `/browse/vocab${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`;

  return (
    <div className="min-h-[calc(100vh-var(--nav-height,60px))] flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-[520px] card-hairline rounded-lg bg-card p-6">
        <p className="font-pretendard text-[12px] font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t('addWord.eyebrow')}
        </p>
        <h1 className="mt-2 font-serif-jp text-[32px] leading-tight text-foreground">
          {t('addWord.title')}
        </h1>
        <p className="mt-3 font-pretendard text-[14px] leading-relaxed text-[var(--muted-foreground)]">
          {t('addWord.description')}
        </p>

        <label className="mt-6 block">
          <span className="font-pretendard text-[13px] font-medium text-foreground">
            {t('addWord.inputLabel')}
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('addWord.placeholder')}
            className="mt-2 w-full rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 font-sans-jp text-[16px] text-foreground outline-none transition-colors focus:border-[var(--accent)]"
          />
        </label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(target)}
            className="min-h-[44px] flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-pretendard text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!query.trim()}
          >
            {t('addWord.searchAction')}
          </button>
          <Link
            to="/browse/vocab"
            className="min-h-[44px] flex-1 rounded-lg border-[0.5px] border-[var(--border)] px-4 py-2.5 text-center font-pretendard text-[14px] font-medium text-foreground transition-colors hover:bg-[var(--surface-alt)]"
          >
            {t('addWord.browseAction')}
          </Link>
        </div>
      </section>
    </div>
  );
}
