import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, type NaturalTranslation } from '../../lib/api';
import { PronunciationButton } from './PronunciationButton';

type Tone = 'polite' | 'neutral' | 'casual' | 'study';

interface NaturalJapaneseSearchProps {
  onUse: (query: string) => void;
}

const TONES: Tone[] = ['polite', 'neutral', 'casual', 'study'];

export function NaturalJapaneseSearch({ onUse }: NaturalJapaneseSearchProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [tone, setTone] = useState<Tone>('polite');
  const mutation = useMutation<NaturalTranslation, Error>({
    mutationFn: async () => {
      const res = await aiApi.naturalTranslate(text, tone);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });

  const result = mutation.data;
  const canSubmit = text.trim().length > 0 && text.trim().length <= 240 && !mutation.isPending;

  return (
    <section className="mb-6 rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-pretendard text-[14px] font-semibold text-foreground">
            {t('naturalSearch.title')}
          </h2>
          <p className="mt-1 font-pretendard text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            {t('naturalSearch.desc')}
          </p>
        </div>
        <span className="mt-1 inline-flex w-fit rounded border border-[var(--border)] px-2 py-0.5 font-pretendard text-[10px] text-[var(--muted-foreground)]">
          Workers AI
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 240))}
          rows={2}
          placeholder={t('naturalSearch.placeholder')}
          className="min-h-[76px] w-full resize-none rounded-lg border-[0.5px] border-[var(--border)] bg-card px-3 py-2.5 font-pretendard text-[14px] text-foreground outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex overflow-x-auto scrollbar-hide rounded-lg border-[0.5px] border-[var(--border)] bg-card p-1">
            {TONES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTone(item)}
                className={`min-h-[36px] whitespace-nowrap rounded px-3 font-pretendard text-[12px] transition-colors ${
                  tone === item
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted-foreground)] hover:bg-accent-soft-20 hover:text-foreground'
                }`}
              >
                {t(`naturalSearch.tones.${item}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="min-h-[40px] rounded-lg bg-[var(--accent)] px-4 py-2 font-pretendard text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? t('naturalSearch.converting') : t('naturalSearch.convert')}
          </button>
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-3 font-pretendard text-[12px] text-red-600">
          {t('naturalSearch.error')}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-lg border-[0.5px] border-[var(--border)] bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-sans-jp text-[20px] leading-relaxed text-foreground">
                {result.translatedText}
              </p>
              {result.readingHint && (
                <p className="mt-1 font-sans-jp text-[12px] text-[var(--muted-foreground)]">
                  {result.readingHint}
                </p>
              )}
            </div>
            <PronunciationButton
              compact
              text={result.translatedText}
              label={t('browse.playPronunciation')}
              className="h-9 w-9 flex-shrink-0"
            />
          </div>

          {result.nuanceKo && (
            <p className="mt-3 font-pretendard text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              {result.nuanceKo}
            </p>
          )}

          {result.alternatives && result.alternatives.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.alternatives.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onUse(item)}
                  className="rounded border border-[var(--border)] px-2.5 py-1 font-sans-jp text-[12px] text-foreground transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onUse(result.translatedText)}
              className="min-h-[40px] flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-pretendard text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('naturalSearch.useForSearch')}
            </button>
            <button
              type="button"
              onClick={() => setText(result.translatedText)}
              className="min-h-[40px] flex-1 rounded-lg border-[0.5px] border-[var(--border)] px-4 py-2 font-pretendard text-[13px] font-medium text-foreground transition-colors hover:bg-[var(--surface-alt)]"
            >
              {t('naturalSearch.refine')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
