/**
 * SideNav — 데스크탑 사이드바 (md 이상에서 표시)
 * Figma Make 디자인 적용
 */
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  return (
    <nav
      aria-label={t('nav.sideLabel')}
      className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-card border-r-[0.5px] border-[var(--border)]"
      style={{ width: 'var(--sidebar-width, 220px)' }}
    >
      {/* 로고 */}
      <div className="h-14 flex items-center px-5 border-b-[0.5px] border-[var(--border)]">
        <span className="font-serif-jp text-[18px] text-[var(--accent)] tracking-tight">JLPT N3</span>
      </div>

      {/* 네비게이션 */}
      <ul className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ to, key }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center rounded px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-foreground hover:bg-accent-soft-20'
                }`
              }
            >
              <span className="font-pretendard text-[13px]">{t(`nav.${key}`)}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* 하단 */}
      <div className="px-5 py-3 border-t-[0.5px] border-[var(--border)]">
        <span className="font-pretendard text-[10px] text-[var(--muted-foreground)]">v1.0.0</span>
      </div>
    </nav>
  );
}

