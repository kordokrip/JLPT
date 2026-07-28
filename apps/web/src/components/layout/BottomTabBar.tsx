import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  House,
  Languages,
  Library,
  MoreHorizontal,
  RotateCcw,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useSettingsStore } from '../../stores/settings-store';
import {
  homePathForTrack,
  navigationForTrack,
  type NavigationIcon,
} from '../../lib/track-registry';

const ICONS: Record<NavigationIcon, LucideIcon> = {
  home: House,
  review: RotateCcw,
  browse: Library,
  quiz: CircleHelp,
  characters: Languages,
  reading: BookOpenText,
  curriculum: GraduationCap,
  selfCheck: BadgeCheck,
  stats: ChartNoAxesColumnIncreasing,
  learn: BookOpenText,
  placement: ClipboardCheck,
  progress: ChartNoAxesColumnIncreasing,
  admin: ShieldCheck,
  settings: Settings,
};

export function BottomTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const firstMenuItem = useRef<HTMLAnchorElement>(null);
  const user = useAuthStore((s) => s.user);
  const track = useSettingsStore((s) => s.learningTrack);
  const homePath = homePathForTrack(track);
  const tabs = navigationForTrack(track, user?.role);
  // Keep the mobile bar to five destinations plus More. A track can expose
  // more primary destinations in the desktop sidebar without creating a
  // second row or undersized tap targets on phones.
  const primaryTabs = tabs.filter((tab) => tab.primary).slice(0, 5);
  const moreTabs = tabs.filter((tab) => !primaryTabs.includes(tab));
  const moreActive = moreTabs.some((tab) => location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`));

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    firstMenuItem.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] min-[760px]:hidden" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.moreMenu')}
            className="absolute inset-x-3 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.75rem)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-glass)] p-3 shadow-[var(--shadow-float)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden="true" />
            <div className="mb-2 px-1 text-sm font-semibold text-foreground">{t('nav.more')}</div>
            <div className="grid grid-cols-2 gap-2">
              {moreTabs.map(({ to, key, icon }, index) => {
                const Icon = ICONS[icon];
                return (
                  <NavLink
                    ref={index === 0 ? firstMenuItem : undefined}
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `touch-target flex items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition-colors ${
                        isActive ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-foreground hover:bg-accent-soft-20'
                      }`
                    }
                  >
                    <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span className="break-keep">{t(`nav.${key}`)}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label={t('nav.mainLabel')}
        className="fixed inset-x-0 bottom-0 z-50 border-t-[0.5px] border-[var(--border)] bg-[var(--surface-glass)] shadow-[0_-8px_28px_rgba(42,30,24,0.08)] backdrop-blur min-[760px]:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'max(env(safe-area-inset-left), 0px)',
          paddingRight: 'max(env(safe-area-inset-right), 0px)',
          height: 'calc(var(--nav-height, 64px) + env(safe-area-inset-bottom))',
        }}
      >
        <ul className="grid grid-cols-6 px-1" style={{ height: 'var(--nav-height, 64px)' }}>
          {primaryTabs.map(({ to, key, icon }) => {
            const Icon = ICONS[icon];
            return (
              <li key={to} className="min-w-0">
                <NavLink
                  to={to}
                  end={to === homePath}
                  className={({ isActive }) =>
                    `relative flex h-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 transition-colors ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)] hover:text-foreground'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute top-1 h-1 w-5 rounded-full bg-[var(--accent)]" aria-hidden="true" />}
                      <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                      <span className="max-w-full truncate text-[11px] font-semibold leading-tight">{t(`nav.${key}`)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => setOpen((value) => !value)}
              className={`relative flex h-full min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 transition-colors ${
                open || moreActive ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)] hover:text-foreground'
              }`}
            >
              {(open || moreActive) && <span className="absolute top-1 h-1 w-5 rounded-full bg-[var(--accent)]" aria-hidden="true" />}
              <MoreHorizontal aria-hidden="true" size={20} strokeWidth={1.8} />
              <span className="max-w-full truncate text-[11px] font-semibold leading-tight">{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
