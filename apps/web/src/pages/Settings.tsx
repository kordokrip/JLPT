/**
 * Settings — 사용자 환경 설정 페이지
 * Figma Make 디자인 적용
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settings-store';
import { audioPlayer } from '../lib/audio';
import type { PlaybackRate, VoiceGender } from '../lib/audio';
import i18n, { SUPPORTED_LANGS, type SupportedLang } from '../i18n';
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from '../lib/push-subscribe';

type Theme = 'light' | 'dark' | 'system';

function applyThemeClass(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export default function Settings() {
  const { t } = useTranslation();
  const {
    theme, setTheme,
    furiganaMode, setFurigana,
    playbackRate, setPlaybackRate,
    voiceGender, setVoiceGender,
    autoPronounce, setAutoPronounce,
    dailyNewLimit, setDailyNewLimit,
    lastSyncedAt,
    language, setLanguage,
  } = useSettingsStore();

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed]       = useState(false);
  const [pushLoading, setPushLoading]         = useState(false);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    getCurrentSubscription().then((sub) => setIsSubscribed(!!sub)).catch(() => {});
  }, []);

  const handlePushToggle = async () => {
    setPushLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        setIsSubscribed(false);
      } else {
        const perm = await requestNotificationPermission();
        setNotifPermission(perm);
        if (perm !== 'granted') return;
        const ok = await subscribeToPush({ morningOn: true, eveningOn: true });
        setIsSubscribed(ok);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleRate = (r: PlaybackRate) => {
    setPlaybackRate(r);
    audioPlayer.rate = r;
  };

  const handleVoiceGender = (v: VoiceGender) => {
    setVoiceGender(v);
    audioPlayer.voiceGender = v;
    void audioPlayer.speakText(t('settings.voicePreviewText'));
  };

  const handleThemeChange = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyThemeClass(nextTheme);
  };

  const handleLangChange = (lang: string) => {
    setLanguage(lang as SupportedLang);
    document.documentElement.lang = lang;
    void i18n.changeLanguage(lang);
  };

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="font-pretendard text-[40px] font-medium text-foreground leading-none mb-3">{t('settings.title')}</h1>
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)]">{t('settings.subtitle')}</p>
      </div>

      {/* 언어 */}
      <SettingSection title={t('settings.language')} subtitle="">
        <SettingRow label={t('settings.languageDesc')} sublabel="">
          <SegmentControl
            options={SUPPORTED_LANGS.map(l => ({ value: l.code, label: l.native }))}
            value={language}
            onChange={handleLangChange}
          />
        </SettingRow>
      </SettingSection>

      {/* 외관 */}
      <SettingSection title={t('settings.appearance')} subtitle="">
        <SettingRow label={t('settings.theme')} sublabel="">
          <SegmentControl
            testId="theme"
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light',  label: t('settings.themeLight')  },
              { value: 'dark',   label: t('settings.themeDark')   },
            ]}
            value={theme}
            onChange={handleThemeChange}
          />
        </SettingRow>
        <SettingRow label={t('settings.furigana')} sublabel="">
          <SegmentControl
            options={[
              { value: 'always', label: t('settings.furiganaAlways') },
              { value: 'hover',  label: t('settings.furiganaHover')  },
              { value: 'never',  label: t('settings.furiganaNever')  },
            ]}
            value={furiganaMode}
            onChange={setFurigana}
          />
        </SettingRow>
      </SettingSection>

      {/* 학습 설정 */}
      <SettingSection title={t('settings.studySettings')} subtitle="">
        <SettingRow label={t('settings.dailyNewLimit')} sublabel={`${dailyNewLimit}${t('common.cards')}`}>
          <input
            type="range"
            min={5} max={100} step={5}
            value={dailyNewLimit}
            onChange={(e) => setDailyNewLimit(Number(e.target.value))}
            className="w-32 accent-[var(--accent)]"
            aria-label={t('settings.dailyNewLimit')}
          />
        </SettingRow>
        <SettingRow label={t('settings.autoPronounce')} sublabel={t('settings.autoPronounceDesc')}>
          <Toggle checked={autoPronounce} onChange={setAutoPronounce} />
        </SettingRow>
        <SettingRow label={t('settings.playbackRate')} sublabel="">
          <SegmentControl
            options={[
              { value: 0.75, label: '0.75×' },
              { value: 1.0,  label: '1.0×'  },
              { value: 1.25, label: '1.25×' },
            ]}
            value={playbackRate}
            onChange={(v) => handleRate(v as PlaybackRate)}
          />
        </SettingRow>
        <SettingRow label={t('settings.voiceGender')} sublabel={t('settings.voiceGenderDesc')}>
          <SegmentControl
            testId="voice-gender"
            options={[
              { value: 'female', label: t('settings.voiceFemale') },
              { value: 'male',   label: t('settings.voiceMale')   },
            ]}
            value={voiceGender}
            onChange={(v) => handleVoiceGender(v as VoiceGender)}
          />
        </SettingRow>
      </SettingSection>

      {/* 데이터 관리 */}
      <SettingSection title={t('settings.dataManagement')} subtitle="" danger>
        <SettingRow label={t('settings.lastSync')} sublabel="">
          <span className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
            {lastSyncedAt === new Date(0).toISOString()
              ? t('settings.neverSynced')
              : new Date(lastSyncedAt).toLocaleString(language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : 'en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
          </span>
        </SettingRow>
      </SettingSection>

      {/* Push 알림 */}
      <SettingSection title={t('settings.notifications')} subtitle="">
        {notifPermission === 'denied' ? (
          <SettingRow label={t('settings.notifBlocked')} sublabel={t('settings.notifBlockedDesc')}>
            <span className="text-xs text-amber-600 font-pretendard">{t('settings.blocked')}</span>
          </SettingRow>
        ) : (
          <SettingRow
            label={t('settings.dailyReminder')}
            sublabel={isSubscribed ? t('settings.reminderActiveDesc') : t('settings.reminderDesc')}
          >
            {pushLoading ? (
              <span className="text-xs text-stone-400 font-pretendard">{t('common.loading')}</span>
            ) : (
              <Toggle checked={isSubscribed} onChange={handlePushToggle} />
            )}
          </SettingRow>
        )}
      </SettingSection>
    </div>
  );
}

// ─── 공통 컴포넌트 ───

function SettingSection({
  title, subtitle, children, danger = false
}: {
  title: string; subtitle?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-pretendard text-[18px] font-medium text-foreground">{title}</h2>
        {subtitle && <span className="font-pretendard text-[12px] text-[var(--muted-foreground)]">{subtitle}</span>}
      </div>
      <div className={`card-hairline rounded-lg divide-y divide-[var(--border)] overflow-hidden ${danger ? 'border-[var(--accent)]/30' : ''}`}>
        {children}
      </div>
    </section>
  );
}

function SettingRow({ label, sublabel, children }: { label: string; sublabel: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <div>
        <div className="font-pretendard text-[14px] text-foreground">{label}</div>
        {sublabel && <div className="font-pretendard text-[11px] text-[var(--muted-foreground)] mt-0.5">{sublabel}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-12 rounded-full transition-colors ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SegmentControl<T extends string | number>({
  options, value, onChange, testId,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testId?: string;
}) {
  return (
    <div className="flex gap-1 bg-[var(--border)]/30 rounded-lg p-0.5" data-testid={testId ? `${testId}-control` : undefined}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          data-testid={testId ? `${testId}-option-${String(opt.value)}` : undefined}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded text-[11px] font-pretendard transition-colors ${
            value === opt.value
              ? 'bg-card text-[var(--accent)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
