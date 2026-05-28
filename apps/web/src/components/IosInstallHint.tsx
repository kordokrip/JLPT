/**
 * apps/web/src/components/IosInstallHint.tsx
 *
 * iOS Safari "홈 화면에 추가" 안내 배너 (1회만 표시)
 *
 * 표시 조건:
 *   - iOS Safari (standalone 모드가 아닌 경우)
 *   - localStorage 'ios-hint-dismissed' 키가 없는 경우
 *
 * 다크모드: CSS 변수 기반으로 자동 대응
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'ios-hint-dismissed';

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iOS 기기 (iPhone / iPad / iPod) + Safari (Chrome·Firefox 제외)
  const isIos    = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios/i.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  // PWA가 이미 홈 화면에서 실행 중이면 표시 불필요
  return (
    typeof window !== 'undefined' &&
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function IosInstallHint() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed && isIosSafari() && !isStandalone()) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('pwa.installDialogLabel')}
      className="fixed bottom-20 inset-x-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      {/* 배너 카드 */}
      <div
        className="card-hairline rounded-2xl bg-card px-5 py-4 shadow-lg"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 앱 아이콘 대용 */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'var(--color-accent-soft)' }}
            >
              🇯🇵
            </div>
            <div>
              <p className="font-sans-jp text-[13px] font-medium text-foreground leading-snug">
                {t('pwa.installTitle')}
              </p>
              <p className="font-pretendard text-[12px] text-[var(--muted-foreground)] leading-snug mt-0.5">
                {t('pwa.installSubtitle')}
              </p>
            </div>
          </div>
          {/* 닫기 버튼 */}
          <button
            onClick={dismiss}
            aria-label={t('common.close')}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'var(--color-border)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              style={{ color: 'var(--muted-foreground)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 안내 단계 */}
        <div
          className="mt-4 rounded-xl px-4 py-3 space-y-2"
          style={{ background: 'var(--color-accent-soft)' }}
        >
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-pretendard text-[10px] font-bold text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              1
            </span>
            <span className="font-pretendard text-[12px] text-foreground">
              {t('pwa.installStep1')}
              <span className="inline-flex items-center gap-0.5 align-middle">
                {/* Share 아이콘 */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 inline"
                  style={{ color: 'var(--color-accent)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25"
                  />
                </svg>
              </span>{' '}
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-pretendard text-[10px] font-bold text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              2
            </span>
            <span className="font-pretendard text-[12px] text-foreground">
              {t('pwa.installStep2')}
            </span>
          </div>
        </div>

        {/* 하단 힌트 */}
        <p className="mt-3 font-pretendard text-[11px] text-center" style={{ color: 'var(--muted-foreground)' }}>
          {t('pwa.installFooter')}
        </p>
      </div>

      {/* 말풍선 꼬리 (Safari 툴바 방향 → 아래) */}
      <div
        className="mx-auto w-0 h-0"
        style={{
          borderLeft:  '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop:   '8px solid var(--color-border)',
          width: 0,
          marginTop: -1,
          marginLeft: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
}
