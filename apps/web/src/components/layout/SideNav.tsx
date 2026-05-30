/**
 * SideNav — 데스크탑 사이드바 (md 이상에서 표시)
 * Figma Make 디자인 적용
 */
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/ui-store';

const NAV_ITEMS = [
  { to: '/',             key: 'home'       },
  { to: '/review',       key: 'review'     },
  { to: '/browse/vocab', key: 'browse'     },
  { to: '/quiz',         key: 'quiz'       },
  { to: '/reading',      key: 'reading'    },
  { to: '/curriculum',   key: 'curriculum' },
  { to: '/self-check',   key: 'selfCheck'  },
  { to: '/stats',        key: 'stats'      },
  { to: '/settings',     key: 'settings'   },
] as const;

export function SideNav() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sideNavCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSideNavCollapsed);

  return (
    <nav
      aria-label={t('nav.sideLabel')}
      data-state={collapsed ? 'collapsed' : 'expanded'}
      className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-card border-r-[0.5px] border-[var(--border)] transition-[width] duration-300"
      style={{ width: 'var(--sidebar-width, 220px)' }}
    >
      {/* 로고 */}
      <div className={`h-14 flex items-center border-b-[0.5px] border-[var(--border)] ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        <span className="font-serif-jp text-[18px] text-[var(--accent)] tracking-tight">
          {collapsed ? 'N3' : 'JLPT N3'}
        </span>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t('nav.collapseSide')}
            title={t('nav.collapseSide')}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--muted-foreground)] transition-colors hover:bg-accent-soft-20 hover:text-foreground"
          >
            <ChevronLeftIcon />
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <ul className={`flex-1 overflow-y-auto py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_ITEMS.map(({ to, key }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              title={collapsed ? t(`nav.${key}`) : undefined}
              className={({ isActive }) =>
                `flex items-center rounded py-2.5 transition-colors ${
                  collapsed ? 'justify-center px-2' : 'px-3'
                } ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-foreground hover:bg-accent-soft-20'
                }`
              }
            >
              <span className="font-pretendard text-[13px]">
                {collapsed ? t(`nav.${key}`).slice(0, 1) : t(`nav.${key}`)}
              </span>
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
            className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded text-[var(--muted-foreground)] transition-colors hover:bg-accent-soft-20 hover:text-foreground"
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <span className="font-pretendard text-[10px] text-[var(--muted-foreground)]">v1.0.0</span>
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
