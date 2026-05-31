/**
 * BottomTabBar — 모바일 하단 탭 바 (md 이상에서 숨김)
 * Figma Make 디자인 적용
 */
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const TABS = [
  { to: '/',             key: 'home',       icon: HomeIcon       },
  { to: '/review',       key: 'review',     icon: ReviewIcon     },
  { to: '/browse/vocab', key: 'browse',     icon: BrowseIcon     },
  { to: '/quiz',         key: 'quiz',       icon: QuizIcon       },
  { to: '/reading',      key: 'reading',    icon: ReadingIcon    },
  { to: '/curriculum',   key: 'curriculum', icon: CurriculumIcon },
  { to: '/self-check',   key: 'selfCheck',  icon: CheckIcon      },
  { to: '/stats',        key: 'stats',      icon: StatsIcon      },
  { to: '/settings',     key: 'settings',   icon: SettingsIcon   },
] as const;

const PRIMARY_TAB_KEYS = new Set(['home', 'review', 'browse', 'quiz', 'settings']);
const PRIMARY_TABS = TABS.filter((tab) => PRIMARY_TAB_KEYS.has(tab.key));
const MORE_TABS = TABS.filter((tab) => !PRIMARY_TAB_KEYS.has(tab.key));

export function BottomTabBar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label={t('nav.moreMenu')}
            className="absolute inset-x-3 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.75rem)] rounded-lg border border-[var(--border)] bg-card p-2 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-1">
              {MORE_TABS.map(({ to, key, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded px-3 py-2 text-[13px] transition-colors ${
                      isActive ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-foreground hover:bg-accent-soft-20'
                    }`
                  }
                >
                  <Icon />
                  <span className="font-pretendard break-keep">{t(`nav.${key}`)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label={t('nav.mainLabel')}
        className="fixed bottom-0 inset-x-0 z-50 bg-card border-t-[0.5px] border-[var(--border)] md:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'max(env(safe-area-inset-left), 0px)',
          paddingRight: 'max(env(safe-area-inset-right), 0px)',
          height: 'calc(var(--nav-height, 64px) + env(safe-area-inset-bottom))',
        }}
      >
        <ul
          className="grid grid-cols-6"
          style={{ height: 'var(--nav-height, 64px)' }}
        >
          {PRIMARY_TABS.map(({ to, key, icon: Icon }) => (
            <li key={to} className="min-w-0">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex h-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                    isActive
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted-foreground)] hover:text-foreground'
                  }`
                }
              >
                <Icon />
                <span className="max-w-full truncate font-pretendard text-[10px] leading-tight">{t(`nav.${key}`)}</span>
              </NavLink>
            </li>
          ))}
          <li className="min-w-0">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => setOpen((value) => !value)}
              className={`flex h-full min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                open ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)] hover:text-foreground'
              }`}
            >
              <MoreIcon />
              <span className="max-w-full truncate font-pretendard text-[10px] leading-tight">{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

// ─── Icons ───
function HomeIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
function ReviewIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
function BrowseIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function ReadingIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function CurriculumIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 5.25h13.5A1.5 1.5 0 0120.25 6.75v12A1.5 1.5 0 0118.75 20.25H5.25a1.5 1.5 0 01-1.5-1.5v-12a1.5 1.5 0 011.5-1.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h3.5M8 15.5h6.5" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function StatsIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  );
}
