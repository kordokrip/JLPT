/**
 * Home — 대시보드 (due 수, 주간 진도, 오늘 할 일)
 * Figma Make 디자인 적용 + 실제 API 데이터 연결
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDueCards, useSrsStats } from '../hooks/useSRS';
import { StreakBadge } from '../components/feature/StreakBadge';

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
    <div className="max-w-[880px] mx-auto px-7 py-6 pb-24">

      {/* ── 날짜 헤더 ── */}
      <div className="mb-4">
        <h1 className="font-serif-jp text-[34px] font-light text-foreground leading-none tracking-tight mb-1">
          {date}
        </h1>
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-[0.08em]">
          {day}
        </p>
      </div>

      {/* ── 스트릭 배지 ── */}
      <div className="mb-4">
        <StreakBadge />
      </div>

      {/* ── 인사 ── */}
      <div className="mb-5">
        <p className="font-pretendard text-[15px] text-foreground">
          {t('home.greeting')}
        </p>
      </div>

      {/* ── 주간 진도 카드 ── */}
      <div className="rounded-xl bg-card p-5 mb-5 border-[0.5px] border-[var(--border)]">
        <div className="flex items-center gap-5">
          {/* 진도 링 */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative w-[80px] h-[80px]">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke="var(--accent)" strokeWidth="5"
                  strokeDasharray={`${(weekProgress / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-medium text-[16px] text-foreground">{weekProgress}%</div>
                <div className="text-[8px] text-[var(--muted-foreground)]">{t('home.thisWeek')}</div>
              </div>
            </div>
          </div>

          {/* 통계 바 */}
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-foreground font-medium">{t('home.reviewWaiting')}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{reviewCards}{t('common.cards')}</span>
              </div>
              <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(100, reviewCards)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-foreground font-medium">{t('home.newCards')}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{newCards}{t('common.cards')}</span>
              </div>
              <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(100, newCards)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-foreground font-medium">{t('home.totalCards')}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{totalCards}{t('common.cards')}</span>
              </div>
              <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(100, (totalCards / 500) * 100)}%` }} />
              </div>
            </div>
            <div className="pt-2">
              <Link to="/curriculum" className="text-[10px] text-[var(--accent)] hover:opacity-80 transition-opacity">
                {t('home.weekDetail')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 오늘 할 일 ── */}
      <div className="mb-5">
        <h2 className="text-[14px] font-medium mb-3">{t('home.todayTasks')}</h2>
        <div className="space-y-0 border-t-[0.5px] border-[var(--border)]">
          {dueCount > 0 && (
            <Link
              to="/review"
              className="w-full flex items-center gap-2 py-3 border-b-[0.5px] border-[var(--border)] hover:bg-accent-soft-20 transition-colors"
            >
              <span className="text-[var(--accent)] font-medium text-[12px] min-w-[14px]">1.</span>
              <div className="flex-1">
                <div className="font-pretendard text-[12px] font-medium">{t('home.reviewCards', { count: dueCount })}</div>
                <div className="font-pretendard text-[10px] text-[var(--muted-foreground)] mt-0.5">{t('home.srsReview')}</div>
              </div>
              {reviewMin > 0 && <span className="text-[10px] text-[var(--muted-foreground)]">{t('home.aboutMin', { min: reviewMin })}</span>}
            </Link>
          )}

          {newCards > 0 && (
            <Link
              to="/browse/vocab"
              className="w-full flex items-center gap-2 py-3 border-b-[0.5px] border-[var(--border)] hover:bg-accent-soft-20 transition-colors"
            >
              <span className="text-[var(--accent)] font-medium text-[12px] min-w-[14px]">{dueCount > 0 ? '2.' : '1.'}</span>
              <div className="flex-1">
                <div className="font-pretendard text-[12px] font-medium">{t('home.newWordsCount', { count: newCards })}</div>
                <div className="font-pretendard text-[10px] text-[var(--muted-foreground)] mt-0.5">{t('home.newVocab')}</div>
              </div>
              {newMin > 0 && <span className="text-[10px] text-[var(--muted-foreground)]">{t('home.aboutMin', { min: newMin })}</span>}
            </Link>
          )}

          {isLoading && (
            <div className="py-3 border-b-[0.5px] border-[var(--border)] text-[12px] text-[var(--muted-foreground)] text-center">
              {t('common.loading')}
            </div>
          )}

          {!isLoading && dueCount === 0 && newCards === 0 && (
            <div className="py-3 border-b-[0.5px] border-[var(--border)]">
              <div className="font-pretendard text-[12px] font-medium text-[var(--accent)]">
                {t('home.allDoneTitle')}
              </div>
              <div className="font-pretendard text-[10px] text-[var(--muted-foreground)] mt-0.5">{t('home.allDone')}</div>
            </div>
          )}

          <Link
            to="/self-check"
            className="w-full flex items-center gap-2 py-3 border-b-[0.5px] border-[var(--border)] hover:bg-accent-soft-20 transition-colors"
          >
            <span className="text-[var(--accent)] font-medium text-[12px] min-w-[14px]">·</span>
            <div className="flex-1">
              <div className="font-pretendard text-[12px] font-medium">{t('home.selfCheckLink')}</div>
              <div className="font-pretendard text-[10px] text-[var(--muted-foreground)] mt-0.5">{t('home.abilityCheck')}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 빠른 이동 ── */}
      <div>
        <h2 className="font-pretendard text-[14px] mb-3">{t('home.quickAccess')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ITEMS.map(({ to, key }) => (
            <Link
              key={to}
              to={to}
              className="card-hairline rounded-lg px-4 py-3 hover:border-[var(--accent)]/30 transition-all press-feedback"
            >
              <div className="font-pretendard text-[13px] font-medium text-foreground">
                {key === 'curriculum' ? t('nav.curriculum') : t(`browse.${key}`)}
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
