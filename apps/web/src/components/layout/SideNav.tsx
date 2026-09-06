import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  House,
  Languages,
  Library,
  RotateCcw,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useUiStore } from '../../stores/ui-store';
import { useAuthStore } from '../../stores/auth-store';
import { useSettingsStore } from '../../stores/settings-store';
import {
  homePathForTrack,
  navigationForTrack,
  webTrackDefinition,
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

export function SideNav() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sideNavCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSideNavCollapsed);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const track = useSettingsStore((s) => s.learningTrack);
  const railMode = useNavigationRailMode();
  const compact = collapsed || railMode;
  const trackDefinition = webTrackDefinition(track);
  const homePath = homePathForTrack(track);
  const items = navigationForTrack(track, user?.role);

  return (
    <nav
      aria-label={t('nav.sideLabel')}
      data-state={compact ? 'collapsed' : 'expanded'}
      data-mode={railMode ? 'rail' : 'sidebar'}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r-[0.5px] border-[var(--border)] bg-[var(--surface-glass)] shadow-[var(--shadow-soft)] backdrop-blur transition-[width] duration-300 min-[760px]:flex"
      style={{ width: 'var(--active-sidebar-width)' }}
    >
      <div className={`flex h-[72px] items-center border-b-[0.5px] border-[var(--border)] ${compact ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <NavLink
          to={homePath}
          aria-label={t('nav.productHome', { product: trackDefinition.shortLabel })}
          className={`group flex min-w-0 items-center ${compact ? 'justify-center' : 'gap-3'}`}
        >
          {compact && <span className="sr-only">JLPT · TOPIK Study</span>}
          <img
            src="/brand-mark.png"
            alt=""
            className={`${compact ? 'h-11 w-11' : 'h-12 w-12'} shrink-0 rounded-[var(--radius-md)] border border-black/10 object-cover shadow-[0_10px_24px_rgba(42,30,24,0.14)] transition-transform group-hover:scale-[1.03]`}
          />
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-bold leading-none text-foreground">
                JLPT · TOPIK
              </span>
              <span className="mt-1 block truncate text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                {trackDefinition.productLabel}
              </span>
            </span>
          )}
        </NavLink>
        {!compact && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t('nav.collapseSide')}
            title={t('nav.collapseSide')}
            className="touch-target inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:bg-accent-soft-20 hover:text-foreground"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
        )}
      </div>

      <ul className={`flex-1 space-y-1 overflow-y-auto py-3 ${compact ? 'px-2' : 'px-3'}`}>
        {items.map(({ to, key, icon }) => {
          const Icon = ICONS[icon];
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={to === homePath}
                title={t(`nav.${key}`)}
                className={({ isActive }) =>
                  `relative flex min-h-11 items-center rounded-[var(--radius-md)] transition-colors ${
                    compact ? 'flex-col justify-center gap-1 px-1 py-2 text-center' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-accent-soft-20 hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !compact && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[var(--accent)]" aria-hidden="true" />}
                    <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span className={`leading-tight ${compact ? 'max-w-[5.25rem] whitespace-normal break-keep text-[11px] font-semibold' : 'text-sm font-semibold'}`}>
                      {t(`nav.${key}`)}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className={`border-t-[0.5px] border-[var(--border)] ${compact ? 'px-2 py-3' : 'px-5 py-3'}`}>
        {compact ? (
          railMode ? (
            <div className="mx-auto h-2 w-8 rounded-full bg-[var(--border)]" aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={t('nav.expandSide')}
              title={t('nav.expandSide')}
              className="touch-target mx-auto inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:bg-accent-soft-20 hover:text-foreground"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          )
        ) : (
          <div className="space-y-2">
            <div className="truncate text-[10px] text-[var(--muted-foreground)]">{user?.email}</div>
            <button type="button" onClick={() => void logout()} className="min-h-9 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 text-xs font-semibold">
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function useNavigationRailMode() {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 760px) and (max-width: 1023.98px)');
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return matches;
}
