import { useTranslation } from 'react-i18next';
import { CATEGORY_TITLE } from './data';
import { buildSelfCheckPayload } from './logic';
import { RadarChart } from './RadarChart';
import type { UseMutationResult } from '@tanstack/react-query';
import type { SelfCheckPayload, SelfCheckSection, SelfCheckTemplate } from './types';

type SelfCheckViewProps = {
  selectedWeek: number;
  isLoading: boolean;
  checkedLocal: Set<string>;
  checkedCount: number;
  totalCount: number;
  pct: number;
  sections: SelfCheckSection[];
  templates: SelfCheckTemplate[];
  radarScores: number[];
  recommendations: SelfCheckTemplate[];
  submit: UseMutationResult<unknown, Error, SelfCheckPayload>;
  onToggle: (key: string) => void;
};

export function SelfCheckView({
  selectedWeek,
  isLoading,
  checkedLocal,
  checkedCount,
  totalCount,
  pct,
  sections,
  templates,
  radarScores,
  recommendations,
  submit,
  onToggle,
}: SelfCheckViewProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      <div className="mb-8">
        <h1 className="font-serif-jp text-[48px] font-normal text-foreground leading-none mb-3">
          {t('selfCheck.title')}
        </h1>
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)]">
          {t('selfCheck.subtitle')}
        </p>
        <p className="font-pretendard text-[12px] text-[var(--muted-foreground)] mt-2">
          {t('curriculum.weekLabel', { week: selectedWeek })}
        </p>
      </div>

      <div className="card-hairline rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center flex-shrink-0">
          <div className="font-serif-jp text-[56px] text-[var(--accent)] font-normal leading-none">
            {isLoading ? '-' : `${pct}%`}
          </div>
          <div className="font-pretendard text-[12px] text-[var(--muted-foreground)] mt-1">
            {checkedCount} / {totalCount}
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <RadarChart scores={radarScores} />
        </div>
      </div>

      <RecommendationPanel recommendations={recommendations} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <SelfCheckSections sections={sections} checkedLocal={checkedLocal} onToggle={onToggle} />
      )}

      <div className="mt-8">
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(buildSelfCheckPayload(selectedWeek, checkedLocal, templates))}
          className="w-full py-3 bg-[var(--accent)] text-white rounded-lg font-medium font-pretendard text-[14px] hover:opacity-90 transition-opacity press-feedback disabled:opacity-50"
        >
          {submit.isPending ? t('common.saving') : t('selfCheck.save')}
        </button>
        {submit.isError && (
          <p className="text-center text-[12px] text-[var(--destructive)] mt-2">
            {(submit.error as Error).message}
          </p>
        )}
        {submit.isSuccess && (
          <p className="text-center text-[12px] text-[var(--muted-foreground)] mt-2">{t('selfCheck.saved')}</p>
        )}
      </div>
    </div>
  );
}

function RecommendationPanel({ recommendations }: { recommendations: SelfCheckTemplate[] }) {
  const { t } = useTranslation();
  return (
    <div className="card-hairline rounded-xl p-5 mb-8">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="font-pretendard text-[15px] font-semibold text-foreground">
          {t('selfCheck.recommendTitle')}
        </h2>
        <p className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
          {t('selfCheck.recommendSubtitle')}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {recommendations.map((item) => (
          <article key={item.code} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="mb-2 text-[11px] font-semibold text-[var(--accent)]">
              {CATEGORY_TITLE[item.category]}
            </p>
            <p className="mb-3 text-[13px] leading-relaxed text-foreground">
              {item.recommendation_ko}
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              {item.evidence_ko}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SelfCheckSections({
  sections,
  checkedLocal,
  onToggle,
}: {
  sections: SelfCheckSection[];
  checkedLocal: Set<string>;
  onToggle: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.category}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-pretendard text-[15px] font-medium text-foreground">{section.title}</h2>
            <span className="text-[11px] text-[var(--muted-foreground)] font-pretendard">{section.items.length}{t('selfCheck.itemUnit')}</span>
          </div>
          <div className="card-hairline rounded-lg divide-y divide-[var(--border)]">
            {section.items.map((item) => {
              const key = item.code;
              const isChecked = checkedLocal.has(key);
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-accent-soft-10 transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-card'
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => onToggle(key)} />
                  <span className={`font-pretendard text-[13px] leading-relaxed ${isChecked ? 'line-through text-[var(--muted-foreground)]' : 'text-foreground'}`}>
                    {item.item_ko}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
