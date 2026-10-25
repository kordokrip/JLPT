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
import { useLearningProfile } from '../../hooks/useLearningProfile';
import { useAccountPreferences } from '../../hooks/useAccountPreferences';
import { AccountMenu } from '../account/AccountMenu';
import { accountPersonalizationEnabled } from '../../lib/account-personalization-flag';
import { studyButton } from '../../features/study/StudyComponents';

export function RootLayout() {
  const profile=useLearningProfile();
  useContentVersionInvalidation();
  const isOnline = useUiStore((s) => s.isOnline);
  const sideNavCollapsed = useUiStore((s) => s.sideNavCollapsed);
  const learningTrack = useSettingsStore((s) => s.learningTrack);
  const accent = useSettingsStore((s) => s.accent);
  const { t } = useTranslation();
  const scope = useDataScope();
  useAccountPreferences(accountPersonalizationEnabled);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const authError = useAuthStore(s => s.error);

  return (
    <div
      data-side-state={sideNavCollapsed ? 'collapsed' : 'expanded'}
      data-learning-track={learningTrack}
      data-account-accent={accountPersonalizationEnabled ? accent : 'track'}
      className="app-shell relative min-h-dvh bg-[var(--background)]"
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
          'app-main relative z-10',
          'min-w-0 pt-[env(safe-area-inset-top)]',
          !isOnline ? 'mt-[calc(env(safe-area-inset-top)+1.5rem)]' : '',
        ].join(' ')}
      >
        {learningExperienceEnabled && <header className="learner-header">{accountPersonalizationEnabled ? <><Link to="/settings" className="learner-header__track"><span className="learner-header__seal" aria-hidden="true" lang={learningTrack==='jlpt-ja'?'ja':'ko'}>{learningTrack==='jlpt-ja'?'あ':'가'}</span><span className="text-[var(--track-accent)]">{learningTrack==='jlpt-ja'?'JLPT':'TOPIK'}</span><span className="learner-header__level">{profile.data?.target_level??''}</span></Link><AccountMenu /></> : <details className="learner-header__legacy"><summary className={studyButton + ' cursor-pointer text-right'}>{t('study.account')}</summary><div className="space-y-4 py-4"><Link to="/settings" className={studyButton + ' inline-flex items-center'}>{t('nav.settings')}</Link>{user?.role === 'admin' && <Link to="/admin/users" className={studyButton + ' ml-2 inline-flex items-center'}>{t('nav.adminUsers')}</Link>}<button className={studyButton + ' ml-2'} onClick={() => void logout()}>{t('nav.logout')}</button></div></details>}</header>}
        {authError === 'logout_failed' && <p role="alert" className="surface-card mx-4 p-4">{t('study.auth.logoutFailed')}</p>}
        <div className="app-outlet" key={scope}><Outlet /></div>
      </main>

      {/* 하단 탭 (모바일) */}
      <BottomTabBar />

      {/* iOS Safari 홈 화면 추가 안내 (1회만) */}
      {/* 강성호 2026-10-11: 새 학습 홈을 가리는 iOS 설치 팝업은 설정 안의 인라인 안내로 이동한다. */}
      {!learningExperienceEnabled && <IosInstallHint />}
    </div>
  );
}
