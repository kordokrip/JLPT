/**
 * RootLayout — 앱 공통 레이아웃 (Outlet)
 */
import { Link, Outlet } from 'react-router-dom';
import { SideNav }         from './SideNav';
import { BottomTabBar }    from './BottomTabBar';
import { useUiStore }      from '../../stores/ui-store';
import { IosInstallHint }  from '../IosInstallHint';
import { useTranslation }  from 'react-i18next';
import { useContentVersionInvalidation } from '../../hooks/useContentVersionInvalidation';
import { useSettingsStore } from '../../stores/settings-store';
import { useAuthStore } from '../../stores/auth-store';
import { useDataScope } from '../../hooks/useDataScope';
import { learningExperienceEnabled } from '../../lib/learning-flag';
import { LanguageSelect, studyButton } from '../../features/study/StudyComponents';
import { LearningTrackSwitch } from '../feature/LearningTrackSwitch';
import { useLearningProfile } from '../../hooks/useLearningProfile';

export function RootLayout() {
  useLearningProfile();
  useContentVersionInvalidation();
  const isOnline = useUiStore((s) => s.isOnline);
  const sideNavCollapsed = useUiStore((s) => s.sideNavCollapsed);
  const learningTrack = useSettingsStore((s) => s.learningTrack);
  const { t } = useTranslation();
  const scope = useDataScope();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  return (
    <div
      data-side-state={sideNavCollapsed ? 'collapsed' : 'expanded'}
      data-learning-track={learningTrack}
      className="app-shell relative min-h-dvh overflow-x-clip bg-[var(--background)]"
    >
      {!learningExperienceEnabled && <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-no-repeat mix-blend-multiply dark:mix-blend-soft-light"
        style={{
          backgroundImage: "url('/brand-hero-eastasia-v2.png')",
          backgroundPosition: 'right max(1rem, env(safe-area-inset-right)) bottom max(4.5rem, env(safe-area-inset-bottom))',
          backgroundSize: 'min(78vw, 760px) auto',
          opacity: 'var(--track-art-opacity)',
        }}
      />}
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
          className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs text-center pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-1"
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
          'relative z-10',
          'min-[760px]:pl-[var(--active-sidebar-width)]',
          'h-[calc(100dvh-var(--nav-height)-env(safe-area-inset-bottom))] overflow-y-auto min-[760px]:h-auto min-[760px]:min-h-dvh min-[760px]:overflow-visible',
          'pb-0 min-[760px]:pb-0',
          'min-w-0 pt-[env(safe-area-inset-top)]',
          !isOnline ? 'mt-[calc(env(safe-area-inset-top)+1.5rem)]' : '',
        ].join(' ')}
      >
        {learningExperienceEnabled && <header className="flex justify-end border-b border-[var(--border)] px-4 py-2">
          <details className="w-full max-w-xl">
            <summary className={studyButton + ' cursor-pointer text-right'}>{t('study.account')}</summary>
            <div className="space-y-4 py-4"><LanguageSelect /><LearningTrackSwitch />
              <Link to="/settings" className={studyButton + ' inline-flex items-center'}>{t('nav.settings')}</Link>
              {user?.role === 'admin' && <Link to="/admin/users" className={studyButton + ' ml-2 inline-flex items-center'}>{t('nav.adminUsers')}</Link>}
              <button className={studyButton + ' ml-2'} onClick={() => void logout()}>{t('nav.logout')}</button>
            </div>
          </details>
        </header>}
        <div key={scope}><Outlet /></div>
      </main>

      {/* 하단 탭 (모바일) */}
      <BottomTabBar />

      {/* iOS Safari 홈 화면 추가 안내 (1회만) */}
      <IosInstallHint />
    </div>
  );
}
