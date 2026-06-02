/**
 * Home — 대시보드 (due 수, 주간 진도, 오늘 할 일)
 * Figma Make 디자인 적용 + 실제 API 데이터 연결
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDueCards, useSrsStats } from '../hooks/useSRS';
import { StreakBadge } from '../components/feature/StreakBadge';
import { Button, Card, Progress } from '../components/ui';

type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getTodayLabel(t: (key: string) => string, language: string) {
  const now = new Date();
  const locale = language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'ko-KR';
  return {
    date: new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(now),
    day: t(`common.days.${DAY_KEYS[now.getDay()]}`),
  };
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const { cards: dueCards, isLoading } = useDueCards();
  const { data: stats } = useSrsStats();

  const dueCount  = dueCards.length;
  const totalCards = stats?.total  ?? 0;
  const newCards   = stats?.new    ?? 0;
  const reviewCards = stats?.review ?? 0;

  const { date, day } = getTodayLabel(t, i18n.language);
  const reviewMin = Math.round(dueCount * 0.43);
  const newMin    = Math.round(newCards * 0.6);

  /* 주간 진행률 (SRS 총 카드 기준 간이 추정) */
  const weekProgress = totalCards > 0
    ? Math.min(100, Math.round((reviewCards / Math.max(totalCards * 0.07, 1)) * 100))
    : 0;

  const QUICK_ITEMS = [
    { to: '/browse/vocab',   key: 'vocab'      },
    { to: '/browse/grammar', key: 'grammar'    },
    { to: '/browse/kanji',   key: 'kanji'      },
    { to: '/curriculum',     key: 'curriculum' },
  ] as const;

  return (
    <div className="app-page">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p data-visual-dynamic className="mb-2 text-sm text-[var(--muted-foreground)]">
            {date} · {day}
          </p>
          <h1 className="font-serif-jp text-[var(--text-2xl)] font-light leading-tight text-foreground">
            {t('home.greeting')}
          </h1>
        </div>
        <div data-visual-dynamic>
          <StreakBadge />
        </div>
      </header>

      <Card elevated className="mb-5 overflow-hidden border-[var(--accent-soft)]">
        <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
          <section className="p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--accent)]">{t('home.todayTasks')}</p>
                <h2 className="mt-1 text-[var(--text-xl)] font-semibold leading-tight text-foreground">
                  {dueCount > 0 ? t('home.reviewCards', { count: dueCount }) : t('home.allDoneTitle')}
                </h2>
              </div>
              <div className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
                {dueCount > 0 ? t('home.aboutMin', { min: reviewMin }) : '0m'}
              </div>
            </div>

            <p className="mb-5 text-sm leading-6 text-[var(--text-secondary)]">
              {dueCount > 0 ? t('home.srsReview') : t('home.allDone')}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="sm:min-w-40">
                <Link to={dueCount > 0 ? '/review' : '/browse/vocab'}>
                  {dueCount > 0 ? t('nav.review') : t('home.newVocab')}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/self-check">{t('home.selfCheckLink')}</Link>
              </Button>
            </div>
          </section>

          <section className="border-t border-[var(--border)] bg-[var(--surface-alt)] p-5 sm:p-6 md:border-l md:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('home.thisWeek')}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t('home.weekDetail')}</p>
              </div>
              <div data-visual-dynamic className="font-serif-jp text-[var(--text-xl)] text-[var(--accent)]">
                {weekProgress}%
              </div>
            </div>
            <Progress value={weekProgress} size="md" className="mb-5" />

            <div data-visual-dynamic className="grid grid-cols-3 gap-2">
              <StatTile label={t('home.reviewWaiting')} value={`${reviewCards}`} suffix={t('common.cards')} />
              <StatTile label={t('home.newCards')} value={`${newCards}`} suffix={t('common.cards')} />
              <StatTile label={t('home.totalCards')} value={`${totalCards}`} suffix={t('common.cards')} />
            </div>
          </section>
        </div>
      </Card>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t('home.todayTasks')}</h2>
          {isLoading && <span className="text-sm text-[var(--muted-foreground)]">{t('common.loading')}</span>}
        </div>
        <div className="grid gap-2">
          {dueCount > 0 && (
            <TaskRow index="1" to="/review" title={t('home.reviewCards', { count: dueCount })} desc={t('home.srsReview')} meta={reviewMin > 0 ? t('home.aboutMin', { min: reviewMin }) : undefined} />
          )}
          {newCards > 0 && (
            <TaskRow index={dueCount > 0 ? '2' : '1'} to="/browse/vocab" title={t('home.newWordsCount', { count: newCards })} desc={t('home.newVocab')} meta={newMin > 0 ? t('home.aboutMin', { min: newMin }) : undefined} />
          )}
          {!isLoading && dueCount === 0 && newCards === 0 && (
            <div className="surface-panel p-4">
              <p className="text-sm font-semibold text-[var(--accent)]">{t('home.allDoneTitle')}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('home.allDone')}</p>
            </div>
          )}
          <TaskRow index="·" to="/self-check" title={t('home.selfCheckLink')} desc={t('home.abilityCheck')} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t('home.quickAccess')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ITEMS.map(({ to, key }) => (
            <Link
              key={to}
              to={to}
              className="surface-panel touch-target flex items-center rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-[var(--accent)]/40 hover:bg-accent-soft-20"
            >
              {key === 'curriculum' ? t('nav.curriculum') : t(`browse.${key}`)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--card)] px-3 py-3">
      <div className="text-lg font-semibold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[11px] leading-tight text-[var(--muted-foreground)]">
        {label}
        <span className="ml-0.5">{suffix}</span>
      </div>
    </div>
  );
}

function TaskRow({
  index, to, title, desc, meta,
}: {
  index: string;
  to: string;
  title: string;
  desc: string;
  meta?: string | undefined;
}) {
  return (
    <Link
      to={to}
      className="surface-panel touch-target flex items-center gap-3 rounded-[var(--radius-md)] p-4 transition-colors hover:border-[var(--accent)]/40 hover:bg-accent-soft-20"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
        {index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-[var(--muted-foreground)]">{desc}</span>
      </span>
      {meta && <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{meta}</span>}
    </Link>
  );
}
