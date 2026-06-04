/**
 * SideNav — 데스크탑 사이드바 (md 이상에서 표시)
 * Figma Make 디자인 적용
 */
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useUiStore } from '../../stores/ui-store';
import { useAuthStore } from '../../stores/auth-store';

const NAV_ITEMS = [
  { to: '/',             key: 'home',       icon: HomeIcon       },
  { to: '/review',       key: 'review',     icon: ReviewIcon     },
  { to: '/browse/vocab', key: 'browse',     icon: BrowseIcon     },
  { to: '/quiz',         key: 'quiz',       icon: QuizIcon       },
  { to: '/characters',   key: 'characters', icon: CharacterIcon  },
  { to: '/reading',      key: 'reading',    icon: ReadingIcon    },
  { to: '/curriculum',   key: 'curriculum', icon: CurriculumIcon },
  { to: '/self-check',   key: 'selfCheck',  icon: CheckIcon      },
  { to: '/stats',        key: 'stats',      icon: StatsIcon      },
  { to: '/admin/users',  key: 'adminUsers', icon: AdminIcon      },
  { to: '/settings',     key: 'settings',   icon: SettingsIcon   },
] as const;

export function SideNav() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sideNavCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSideNavCollapsed);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const items = NAV_ITEMS.filter((item) => item.key !== 'adminUsers' || user?.role === 'admin');

  return (
    <nav
      aria-label={t('nav.sideLabel')}
      data-state={collapsed ? 'collapsed' : 'expanded'}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r-[0.5px] border-[var(--border)] bg-[var(--surface-glass)] shadow-[var(--shadow-soft)] backdrop-blur transition-[width] duration-300 md:flex"
      style={{ width: 'var(--sidebar-width, 220px)' }}
    >
      {/* 로고 */}
      <div className={`flex h-16 items-center border-b-[0.5px] border-[var(--border)] ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        <span className={`font-serif-jp text-[var(--accent)] tracking-tight ${collapsed ? 'text-base' : 'text-lg'}`}>
          {collapsed ? 'N3' : 'JLPT N3'}
        </span>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t('nav.collapseSide')}
            title={t('nav.collapseSide')}
            className="touch-target inline-flex items-center justify-center rounded-[var(--radius-md)] border border-transparent text-[var(--muted-foreground)] transition-colors hover:bg-accent-soft-20 hover:text-foreground focus-visible:border-[var(--accent)]"
          >
            <ChevronLeftIcon />
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <ul className={`flex-1 space-y-1 overflow-y-auto py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        {items.map(({ to, key, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              title={t(`nav.${key}`)}
              className={({ isActive }) =>
                `relative flex min-h-11 items-center rounded-[var(--radius-md)] transition-colors ${
                  collapsed ? 'flex-col justify-center gap-1 px-1 py-2 text-center' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-accent-soft-20 hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--accent)]" aria-hidden="true" />}
              <Icon />
                  <span className={`leading-tight ${collapsed ? 'max-w-[5.25rem] whitespace-normal break-keep text-[11px] font-semibold' : 'text-sm font-semibold'}`}>
                    {t(`nav.${key}`)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* 하단 */}
      <div className={`border-t-[0.5px] border-[var(--border)] ${collapsed ? 'px-2 py-3' : 'px-5 py-3'}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t('nav.expandSide')}
            title={t('nav.expandSide')}
            className="touch-target mx-auto inline-flex items-center justify-center rounded-[var(--radius-md)] border border-transparent text-[var(--muted-foreground)] transition-colors hover:bg-accent-soft-20 hover:text-foreground focus-visible:border-[var(--accent)]"
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <div className="space-y-2">
            <div className="truncate font-pretendard text-[10px] text-[var(--muted-foreground)]">{user?.email}</div>
            <button type="button" onClick={() => void logout()} className="min-h-9 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold">
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      {children}
    </svg>
  );
}

function HomeIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5.5 10.5V20h4.25v-5h4.5v5h4.25v-9.5" /></NavIcon>;
}
function ReviewIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4.5v4.2h-4.2M20 12A8 8 0 0 1 6.3 17.6L4 15.3M4 19.5v-4.2h4.2" /></NavIcon>;
}
function BrowseIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h6.5v15H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Zm7.5 0H19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6.5v-15Z" /></NavIcon>;
}
function QuizIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M12 17.3h.01M9.3 8.7a3.4 3.4 0 0 1 5.4 2.7c0 2.3-2.7 2.4-2.7 4.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></NavIcon>;
}
function CharacterIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14M7 5v14M4 19h16M12 5c-.2 4.8-2.2 8.8-6 12M12 5c.2 4.8 2.2 8.8 6 12" /></NavIcon>;
}
function ReadingIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A8 8 0 0 1 12 7a8 8 0 0 1 8-1.5v13A8 8 0 0 0 12 20a8 8 0 0 0-8-1.5v-13Zm8 1.5v13" /></NavIcon>;
}
function CurriculumIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5v3M17 3.5v3M4.5 8.5h15M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7A1.5 1.5 0 0 1 6 5.5Zm2.5 7h3M8.5 15.5h6" /></NavIcon>;
}
function CheckIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="m8 12.5 2.5 2.5L16 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></NavIcon>;
}
function StatsIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M5 20v-7M12 20V8M19 20V4" /></NavIcon>;
}
function AdminIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 19 6v5.2c0 4.2-2.7 7.9-7 9.3-4.3-1.4-7-5.1-7-9.3V6l7-2.5Zm-2.8 9.1 1.9 1.9 3.7-4.1" /></NavIcon>;
}
function SettingsIcon() {
  return <NavIcon><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm0-5.2v2M12 18.5v2M4.6 5.6l1.4 1.4M18 17l1.4 1.4M2.5 12h2M19.5 12h2M4.6 18.4 6 17M18 7l1.4-1.4" /></NavIcon>;
}
