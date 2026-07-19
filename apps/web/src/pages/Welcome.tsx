import { BookOpenText, ChartNoAxesColumnIncreasing, Headphones, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../stores/settings-store';

const FEATURES = [
  { key: 'path', icon: BookOpenText },
  { key: 'audio', icon: Headphones },
  { key: 'review', icon: Languages },
  { key: 'progress', icon: ChartNoAxesColumnIncreasing },
] as const;

export default function Welcome() {
  const { t } = useTranslation();
  const learningTrack = useSettingsStore((state) => state.learningTrack);
  const setLearningTrack = useSettingsStore((state) => state.setLearningTrack);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#F7F0E2] text-[#222629] dark:bg-[#171B1D] dark:text-[#FFF8EC]">
      <section className="relative flex min-h-[86dvh] items-center overflow-hidden border-b border-black/10 dark:border-white/10">
        <img
          src="/brand-hero.png"
          alt={t('welcome.heroAlt')}
          className="absolute inset-0 h-full w-full object-cover object-[62%_50%] opacity-45 dark:opacity-25 lg:object-right"
          draggable={false}
        />
        <div className="absolute inset-y-0 left-0 w-full bg-[rgba(247,240,226,0.84)] dark:bg-[rgba(23,27,29,0.84)] lg:w-[58%]" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8 lg:px-12">
          <div className="max-w-[680px]">
            <div className="flex items-center gap-3">
              <img
                src="/brand-mark.png"
                alt=""
                className="h-14 w-14 rounded-[var(--radius-md)] border border-black/10 object-cover shadow-[var(--shadow-soft)] sm:h-16 sm:w-16"
              />
              <div>
                <p className="text-sm font-black text-[#C9362B]">JLPT · TOPIK Study</p>
                <p className="mt-1 text-xs font-bold uppercase text-[#557B68] dark:text-[#9BC3AE]">Language Study OS</p>
              </div>
            </div>

            <h1 className="mt-8 max-w-[620px] break-keep text-4xl font-black leading-[1.08] sm:text-5xl lg:text-6xl">
              {t('welcome.title')}
            </h1>
            <p className="mt-5 max-w-[600px] break-keep text-base leading-7 text-[#4E5558] dark:text-[#D8D1C4] sm:text-lg">
              {t('welcome.description')}
            </p>

            <fieldset className="mt-8 max-w-[600px]">
              <legend className="mb-3 text-sm font-bold">{t('welcome.chooseTrack')}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TrackChoice
                  checked={learningTrack === 'jlpt-ja'}
                  title={t('welcome.jlptTitle')}
                  description={t('welcome.jlptDescription')}
                  onClick={() => setLearningTrack('jlpt-ja')}
                />
                <TrackChoice
                  checked={learningTrack === 'topik-ko'}
                  title={t('welcome.topikTitle')}
                  description={t('welcome.topikDescription')}
                  onClick={() => setLearningTrack('topik-ko')}
                />
              </div>
            </fieldset>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[#C9362B] px-7 text-base font-bold text-white shadow-[var(--shadow-soft)] hover:bg-[#A92C24]">
                {t('welcome.login')}
              </Link>
              <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[#183A5A]/35 bg-[rgba(255,255,255,0.56)] px-7 text-base font-bold text-[#183A5A] backdrop-blur dark:border-white/25 dark:bg-black/20 dark:text-[#FFF8EC]">
                {t('welcome.register')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={t('welcome.featuresLabel')} className="mx-auto grid max-w-7xl grid-cols-2 gap-px border-x border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10 lg:grid-cols-4">
        {FEATURES.map(({ key, icon: Icon }) => (
          <article key={key} className="min-h-40 bg-[#FFFDF7] p-5 dark:bg-[#1E2325] sm:p-6">
            <Icon aria-hidden="true" className="text-[#C9362B]" size={24} strokeWidth={1.8} />
            <h2 className="mt-4 text-base font-black">{t(`welcome.features.${key}.title`)}</h2>
            <p className="mt-2 text-sm leading-6 text-[#60676A] dark:text-[#C7C0B5]">{t(`welcome.features.${key}.description`)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function TrackChoice({ checked, title, description, onClick }: { checked: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`min-h-[92px] rounded-[var(--radius-md)] border p-4 text-left transition-colors ${
        checked
          ? 'border-[#C9362B] bg-[#FFF7F0] shadow-[inset_4px_0_0_#C9362B] dark:bg-[#2A2523]'
          : 'border-black/15 bg-white/55 hover:border-[#557B68] dark:border-white/20 dark:bg-black/20'
      }`}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-[#666D70] dark:text-[#C7C0B5]">{description}</span>
    </button>
  );
}
