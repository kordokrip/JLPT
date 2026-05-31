/**
 * RootLayout — 앱 공통 레이아웃 (Outlet)
 */
import { Outlet } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { SideNav }         from './SideNav';
import { BottomTabBar }    from './BottomTabBar';
import { useUiStore }      from '../../stores/ui-store';
import { IosInstallHint }  from '../IosInstallHint';
import { useTranslation }  from 'react-i18next';

export function RootLayout() {
  const isOnline = useUiStore((s) => s.isOnline);
  const sideNavCollapsed = useUiStore((s) => s.sideNavCollapsed);
  const { t } = useTranslation();
  const layoutStyle = {
    '--sidebar-width': sideNavCollapsed ? '6.25rem' : '15rem',
  } as CSSProperties;

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--background)]" style={layoutStyle}>
      {/* 스크린리더용 건너뛰기 링크 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-lg focus:text-sm"
      >
        {t('nav.skipToMain')}
      </a>
      {/* 오프라인 배너 */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs text-center py-1"
        >
          {t('common.offline')}
        </div>
      )}

      {/* 사이드 네비게이션 (데스크탑) */}
      <SideNav />

      {/* 메인 컨텐츠 */}
      <main
        id="main-content"
        className={[
          'md:pl-[var(--sidebar-width)]',
          'pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))] md:pb-0',
          'min-w-0 pt-[env(safe-area-inset-top)]',
          !isOnline ? 'mt-6' : '',
        ].join(' ')}
      >
        <Outlet />
      </main>

      {/* 하단 탭 (모바일) */}
      <BottomTabBar />

      {/* iOS Safari 홈 화면 추가 안내 (1회만) */}
      <IosInstallHint />
    </div>
  );
}
