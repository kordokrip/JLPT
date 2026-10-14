/**
 * Settings — 사용자 환경 설정 페이지
 * Figma Make 디자인 적용
 */
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLearningProfile } from "../hooks/useLearningProfile";
import { useDataScope } from "../hooks/useDataScope";
import {
  learningApi,
  learningExperienceEnabled,
} from "../lib/learning-experience";
import { StudyRequestError } from "../features/study/StudyRequestError";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settings-store";
import {
  applyAccountTheme,
  useAccountPreferences,
} from "../hooks/useAccountPreferences";
import type { AccountPreferenceUpdate } from "../lib/account-api";
import { accountPersonalizationEnabled } from "../lib/account-personalization-flag";
import { DevicePushStatus } from "../components/account/DevicePushStatus";
import { useAuthStore } from "../stores/auth-store";
import { audioPlayer } from "../lib/audio";
import type { PlaybackRate } from "../lib/audio";
import type { ReactNode } from "react";
import { IosInstallHint } from "../components/IosInstallHint";
import type { LearningProfile, LearningTrackId } from "@nihongo-n3/shared";
import i18n, { SUPPORTED_LANGS, type SupportedLang } from "../i18n";
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from "../lib/push-subscribe";

type Theme = "light" | "dark" | "system";

export default function Settings() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash)
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView({ block: "start" });
  }, [location.hash]);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    furiganaMode,
    setFurigana,
    playbackRate,
    setPlaybackRate,
    autoPronounce,
    setAutoPronounce,
    dailyNewLimit,
    setDailyNewLimit,
    lastSyncedAt,
    language,
    setLanguage,
    learningTrack,
    instructionLanguages,
    setInstructionLanguage,
  } = useSettingsStore();
  const accountPreferences = useAccountPreferences(
    accountPersonalizationEnabled,
  );
  const [accountSaving, setAccountSaving] = useState(false);
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftAccent, setDraftAccent] = useState(accent);
  const accountUnavailable =
    accountSaving ||
    accountPreferences.loading ||
    !accountPreferences.preferences;
  const previewDark =
    draftTheme === "dark" ||
    (draftTheme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const prefs = accountPreferences.preferences;
    if (prefs) {
      setDraftTheme(prefs.theme ?? "system");
      setDraftAccent(prefs.accent ?? "track");
    }
  }, [accountPreferences.preferences, authUser?.id]);
  const [draftReminder, setDraftReminder] = useState({
    enabled: false,
    time: "09:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  useEffect(() => {
    if (accountPreferences.preferences)
      setDraftReminder({
        enabled: accountPreferences.preferences.reminder_enabled,
        time: accountPreferences.preferences.reminder_time,
        timezone: accountPreferences.preferences.timezone,
      });
  }, [accountPreferences.preferences]);
  const accountCopy =
    language === "ja"
      ? {
          accent: "アクセント",
          time: "通知時刻",
          enabled: "毎日のリマインダー",
          unsupported: "このブラウザーでは通知を利用できません",
          device: "この端末での通知",
          schedule: "アカウントの通知スケジュール",
        }
      : language === "en"
        ? {
            accent: "Accent",
            time: "Reminder time",
            enabled: "Daily reminder",
            unsupported: "Notifications are not supported by this browser",
            device: "Device notifications",
            schedule: "Account reminder schedule",
          }
        : {
            accent: "강조 색상",
            time: "알림 시간",
            enabled: "매일 알림",
            unsupported: "이 브라우저에서는 알림을 지원하지 않습니다",
            device: "이 기기 알림",
            schedule: "계정 알림 일정",
          };
  const switchTrack = useAuthStore((s) => s.switchTrack);
  const profile = useLearningProfile(),
    scope = useDataScope(),
    queryClient = useQueryClient();
  const profileUnknown =
    learningExperienceEnabled && (!profile.isSuccess || !profile.data);
  const saveInstruction = useMutation({
    mutationFn: async (change: {
      value: "ko" | "ja" | "en";
      profile: LearningProfile | undefined;
      scope: string;
      track: LearningTrackId;
      userId: string | null;
    }) => {
      if (
        (useAuthStore.getState().user?.id ?? null) !== change.userId ||
        useSettingsStore.getState().learningTrack !== change.track
      ) {
        throw new Error(
          "Account or learning track changed before saving preferences",
        );
      }
      if (!learningExperienceEnabled) return null;
      if (!change.profile) throw new Error("Learning profile is not ready");
      if (!change.profile.configured) return null;
      return learningApi.saveProfile({
        ...change.profile,
        instruction_language: change.value,
      });
    },
    onSuccess: (saved, change) => {
      if (saved)
        queryClient.setQueryData(["learning-profile", change.scope], saved);
      if (
        (useAuthStore.getState().user?.id ?? null) === change.userId &&
        useSettingsStore.getState().learningTrack === change.track
      ) {
        setInstructionLanguage(change.track, change.value);
      }
    },
  });

  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState(false);
  const [pushRevision, setPushRevision] = useState(0);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    let active = true;
    setIsSubscribed(false); setPushError(false); setPushLoading(false);
    getCurrentSubscription()
      .then((sub) => { if (active) setIsSubscribed(!!sub); })
      .catch(() => {});
    return () => { active = false; };
  }, [authUser?.id]);

  const handlePushToggle = async () => {
    const owner = authUser?.id;
    const stillOwner = () => useAuthStore.getState().user?.id === owner;
    setPushLoading(true);
    setPushError(false);
    try {
      if (isSubscribed) {
        const removed = await unsubscribeFromPush();
        if (stillOwner()) { setIsSubscribed(!removed); setPushError(!removed); }
      } else {
        const perm = await requestNotificationPermission();
        if (!stillOwner()) return;
        setNotifPermission(perm);
        if (perm !== "granted") return;
        const notificationLanguage =
          language === "ko" || language === "ja" || language === "en"
            ? language
            : learningTrack === "topik-ko"
              ? "ja"
              : "ko";
        const ok = await subscribeToPush({
          morningOn: true,
          eveningOn: true,
          notificationLanguage,
        });
        if (stillOwner()) { setIsSubscribed(ok); setPushError(!ok); }
      }
    } catch {
      if (stillOwner()) setPushError(true);
    } finally {
      if (stillOwner()) { setPushLoading(false); setPushRevision(value => value + 1); }
    }
  };

  const handleRate = (r: PlaybackRate) => {
    setPlaybackRate(r);
    audioPlayer.rate = r;
  };

  const handleThemeChange = (nextTheme: Theme) => {
    if (accountPersonalizationEnabled) setDraftTheme(nextTheme);
    else {
      setTheme(nextTheme);
      applyAccountTheme(nextTheme);
    }
  };

  const saveAccountPreference = async (changes: AccountPreferenceUpdate) => {
    setAccountSaving(true);
    try {
      return await accountPreferences.save(changes);
    } catch (error) {
      throw error;
    } finally {
      setAccountSaving(false);
    }
  };

  const handleLangChange = (lang: string) => {
    setLanguage(lang as SupportedLang);
    document.documentElement.lang = lang;
    void i18n.changeLanguage(lang);
  };

  return (
    <div className="mx-auto max-w-[880px] px-5 py-8 pb-24 sm:px-8 sm:py-12 lg:px-20">
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="mb-3 font-pretendard text-3xl font-medium leading-none text-foreground sm:text-4xl">
          {t("settings.title")}
        </h1>
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)]">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* 언어 */}
      <SettingSection title={t("settings.language")} subtitle="">
        <SettingRow label={t("settings.languageDesc")} sublabel="">
          <SegmentControl
            testId="ui-language"
            options={SUPPORTED_LANGS.map((l) => ({
              value: l.code,
              label: l.native,
            }))}
            value={language}
            onChange={handleLangChange}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.instructionLanguage")}
          sublabel={t("settings.instructionLanguageDesc")}
        >
          <SegmentControl
            options={
              learningTrack === "topik-ko"
                ? [
                    { value: "en", label: "English" },
                    { value: "ko", label: "한국어" },
                    { value: "ja", label: "日本語" },
                  ]
                : [
                    { value: "ko", label: "한국어" },
                    { value: "en", label: "English" },
                    { value: "ja", label: "日本語" },
                  ]
            }
            value={instructionLanguages[learningTrack]}
            disabled={profileUnknown || saveInstruction.isPending}
            onChange={(value) => {
              if (!profileUnknown && !saveInstruction.isPending) {
                saveInstruction.mutate({
                  value,
                  profile: profile.data,
                  scope,
                  track: learningTrack,
                  userId: authUser?.id ?? null,
                });
              }
            }}
          />
          {learningExperienceEnabled && profile.isPending && (
            <p role="status">{t("study.loading")}</p>
          )}
          {saveInstruction.isPending && (
            <p role="status">{t("study.saving")}</p>
          )}
          {(saveInstruction.isError || profile.isError) && (
            <StudyRequestError error={saveInstruction.error ?? profile.error} />
          )}
        </SettingRow>
      </SettingSection>

      {/* 외관 */}
      <div id="appearance" className="scroll-mt-24" />
      <SettingSection title={t("settings.appearance")} subtitle="">
        <SettingRow label={t("settings.theme")} sublabel="">
          <SegmentControl
            testId="theme"
            options={[
              { value: "system", label: t("settings.themeSystem") },
              { value: "light", label: t("settings.themeLight") },
              { value: "dark", label: t("settings.themeDark") },
            ]}
            value={accountPersonalizationEnabled ? draftTheme : theme}
            disabled={accountPersonalizationEnabled && accountUnavailable}
            onChange={handleThemeChange}
          />
        </SettingRow>
        {accountPersonalizationEnabled && (
          <SettingRow label={accountCopy.accent} sublabel="">
            <SegmentControl
              options={[
                {
                  value: "track",
                  label:
                    language === "ja"
                      ? "トラック"
                      : language === "en"
                        ? "Track"
                        : "학습 트랙",
                },
                {
                  value: "forest",
                  label:
                    language === "ja"
                      ? "森"
                      : language === "en"
                        ? "Forest"
                        : "숲",
                },
                {
                  value: "sea",
                  label:
                    language === "ja"
                      ? "海"
                      : language === "en"
                        ? "Sea"
                        : "바다",
                },
                {
                  value: "ink",
                  label:
                    language === "ja" ? "墨" : language === "en" ? "Ink" : "먹",
                },
              ]}
              value={draftAccent}
              disabled={accountUnavailable}
              onChange={setDraftAccent}
            />
          </SettingRow>
        )}
        {accountPersonalizationEnabled && (
          <div className="rounded-2xl border border-[var(--border)] p-5 text-sm">
            <p>
              {language === "ja"
                ? "保存前の表示プレビュー"
                : language === "en"
                  ? "Appearance preview before saving"
                  : "저장 전 외관 미리보기"}
            </p>
            <div
              className="mt-3 rounded-2xl border p-4"
              style={{
                background: previewDark ? "#242422" : "#F7F3EA",
                color: previewDark ? "#EDEDEB" : "#172536",
              }}
            >
              <p className="font-semibold">{t("study.learn")}</p>
              <div
                className="mt-3 h-2 w-2/3 rounded-full"
                style={{
                  background: {
                    track: learningTrack === "jlpt-ja" ? "#C7483D" : "#214764",
                    forest: "#527A69",
                    sea: "#28677A",
                    ink: "#172536",
                  }[draftAccent],
                }}
              />
              <span
                className="mt-3 inline-flex min-h-12 items-center rounded-2xl border-b-4 border-black/20 px-4 font-semibold text-white"
                style={{
                  background: {
                    track: learningTrack === "jlpt-ja" ? "#C7483D" : "#214764",
                    forest: "#527A69",
                    sea: "#28677A",
                    ink: "#172536",
                  }[draftAccent],
                }}
              >
                {t("quiz.start")}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="account-action"
                disabled={accountUnavailable}
                onClick={() =>
                  void saveAccountPreference({
                    theme: draftTheme,
                    accent: draftAccent,
                  }).catch(() => undefined)
                }
              >
                {language === "ja"
                  ? "外観を保存"
                  : language === "en"
                    ? "Save appearance"
                    : "외관 저장"}
              </button>
              <button
                type="button"
                className="account-action"
                disabled={accountSaving}
                onClick={() => {
                  setDraftTheme(theme);
                  setDraftAccent(accent);
                }}
              >
                {language === "ja"
                  ? "キャンセル"
                  : language === "en"
                    ? "Cancel"
                    : "취소"}
              </button>
            </div>
          </div>
        )}
        <SettingRow label={t("settings.furigana")} sublabel="">
          <SegmentControl
            options={[
              { value: "always", label: t("settings.furiganaAlways") },
              { value: "hover", label: t("settings.furiganaHover") },
              { value: "never", label: t("settings.furiganaNever") },
            ]}
            value={furiganaMode}
            onChange={setFurigana}
          />
        </SettingRow>
      </SettingSection>

      {/* 학습 설정 */}
      <SettingSection title={t("settings.studySettings")} subtitle="">
        <SettingRow
          label={t("settings.dailyNewLimit")}
          sublabel={`${dailyNewLimit}${t("common.cards")}`}
        >
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={dailyNewLimit}
            onChange={(e) => setDailyNewLimit(Number(e.target.value))}
            className="h-11 w-32 accent-[var(--accent)]"
            aria-label={t("settings.dailyNewLimit")}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.autoPronounce")}
          sublabel={t("settings.autoPronounceDesc")}
        >
          <Toggle checked={autoPronounce} onChange={setAutoPronounce} />
        </SettingRow>
        <SettingRow label={t("settings.playbackRate")} sublabel="">
          <SegmentControl
            options={[
              { value: 0.75, label: "0.75×" },
              { value: 1.0, label: "1.0×" },
              { value: 1.25, label: "1.25×" },
            ]}
            value={playbackRate}
            onChange={(v) => handleRate(v as PlaybackRate)}
          />
        </SettingRow>
        <SettingRow
          label={t("settings.ttsProvider")}
          sublabel={t("settings.browserVoiceDesc")}
        >
          <span className="rounded border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted-foreground)]">
            {t("settings.googleVoicePreferred")}
          </span>
        </SettingRow>
        <SettingRow
          label={t("settings.audioQa")}
          sublabel={t("settings.audioQaDesc")}
        >
          <Link
            to="/audio-qa"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("settings.openAudioQa")}
          </Link>
        </SettingRow>
      </SettingSection>

      {/* 강성호 2026-10-11: PWA 설치 안내를 설정의 문서 흐름에 둬 학습/설정 버튼을 가리지 않는다. */}
      {learningExperienceEnabled && <IosInstallHint inline />}

      {/* 데이터 관리 */}
      <SettingSection title={t("settings.dataManagement")} subtitle="" danger>
        <SettingRow label={t("settings.lastSync")} sublabel="">
          <span className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
            {lastSyncedAt === new Date(0).toISOString()
              ? t("settings.neverSynced")
              : new Date(lastSyncedAt).toLocaleString(
                  language === "ja"
                    ? "ja-JP"
                    : language === "ko"
                      ? "ko-KR"
                      : "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
          </span>
        </SettingRow>
      </SettingSection>

      {/* Push 알림 */}
      <div id="notifications" className="scroll-mt-24" />
      <SettingSection title={t("settings.notifications")} subtitle="">
        {notifPermission === "denied" ? (
          <SettingRow
            label={t("settings.notifBlocked")}
            sublabel={t("settings.notifBlockedDesc")}
          >
            <span className="text-xs text-amber-600 font-pretendard">
              {t("settings.blocked")}
            </span>
          </SettingRow>
        ) : (
          <SettingRow
            label={accountPersonalizationEnabled ? accountCopy.device : t("settings.dailyReminder")}
            sublabel={
              accountPersonalizationEnabled ? "" : isSubscribed
                ? t("settings.reminderActiveDesc")
                : t("settings.reminderDesc")
            }
          >
            {pushLoading ? (
              <span className="text-xs text-stone-400 font-pretendard">
                {t("common.loading")}
              </span>
            ) : (
              <Toggle checked={isSubscribed} onChange={handlePushToggle} />
            )}
          </SettingRow>
        )}
        {accountPersonalizationEnabled && (
          <SettingRow
            label={accountCopy.schedule}
            sublabel={
              accountPreferences.preferences?.custom_reminder_configured
                ? accountCopy.schedule
                : ""
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Toggle
                checked={draftReminder.enabled}
                onChange={(enabled) =>
                  setDraftReminder((value) => ({ ...value, enabled }))
                }
              />
              <input
                aria-label={accountCopy.time}
                type="time"
                step="900"
                value={draftReminder.time}
                disabled={accountSaving}
                onChange={(event) =>
                  setDraftReminder((value) => ({
                    ...value,
                    time: event.target.value,
                  }))
                }
                className="min-h-11 rounded border border-[var(--border)] bg-[var(--card)] px-2 text-sm"
              />
              <input
                aria-label={
                  language === "ja"
                    ? "タイムゾーン"
                    : language === "ko"
                      ? "시간대"
                      : "Timezone"
                }
                value={draftReminder.timezone}
                disabled={accountUnavailable}
                onChange={(event) =>
                  setDraftReminder((value) => ({
                    ...value,
                    timezone: event.target.value,
                  }))
                }
                className="min-h-12 max-w-48 rounded border border-[var(--border)] bg-[var(--card)] px-2 text-base"
              />
              <button
                type="button"
                className="account-action"
                disabled={
                  accountUnavailable ||
                  !/^([01]\d|2[0-3]):(?:00|15|30|45)$/.test(draftReminder.time)
                }
                onClick={() =>
                  void saveAccountPreference({
                    reminder_enabled: draftReminder.enabled,
                    reminder_time: draftReminder.time,
                    timezone: draftReminder.timezone,
                  }).catch(() => undefined)
                }
              >
                {language === "ja"
                  ? "通知を保存"
                  : language === "en"
                    ? "Save reminder"
                    : "알림 저장"}
              </button>
              <button
                type="button"
                className="account-action"
                onClick={() =>
                  accountPreferences.preferences &&
                  setDraftReminder({
                    enabled: accountPreferences.preferences.reminder_enabled,
                    time: accountPreferences.preferences.reminder_time,
                    timezone: accountPreferences.preferences.timezone,
                  })
                }
              >
                {language === "ja"
                  ? "キャンセル"
                  : language === "en"
                    ? "Cancel"
                    : "취소"}
              </button>
            </div>
          </SettingRow>
        )}
        {accountPersonalizationEnabled && authUser && (
          <DevicePushStatus key={authUser.id + ':' + pushRevision} userId={authUser.id} />
        )}
        {pushError && <p role="alert">{language === 'ja' ? '通知登録を保存できませんでした。再試行してください。' : language === 'en' ? 'Could not save the device subscription. Please retry.' : '기기 구독을 저장하지 못했습니다. 다시 시도해 주세요.'}</p>}
        {accountPersonalizationEnabled && accountPreferences.error && (
          <p role="alert" className="px-1 text-sm">
            {language === "ja"
              ? "設定を読み込み・保存できませんでした。ページを再読み込みしてお試しください。"
              : language === "en"
                ? "Could not load or save settings. Reload and try again."
                : "설정을 불러오거나 저장하지 못했습니다. 새로고침 후 다시 시도하세요."}
          </p>
        )}
      </SettingSection>

      <SettingSection title={t("settings.account")} subtitle="">
        <SettingRow
          label={t("settings.studyTrack")}
          sublabel={t("settings.studyTrackDesc")}
        >
          <SegmentControl
            options={[
              { value: "jlpt-ja", label: t("settings.jlptTrack") },
              { value: "topik-ko", label: t("settings.topikTrack") },
            ]}
            value={learningTrack}
            onChange={(track) => {
              void switchTrack(track).then((ok) => {
                if (ok)
                  navigate(track === "topik-ko" ? "/track/topik-ko" : "/", {
                    replace: true,
                  });
              });
            }}
          />
        </SettingRow>
        <SettingRow
          label={authUser?.email ?? t("settings.loginAccount")}
          sublabel={
            authUser?.role === "admin"
              ? t("settings.adminAccount")
              : t("settings.userAccount")
          }
        >
          <div className="flex flex-wrap gap-2">
            {authUser?.role === "admin" && (
              <Link
                to="/admin/users"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium"
              >
                {t("settings.manageUsers")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                void logout().then(() =>
                  navigate("/welcome", { replace: true }),
                );
              }}
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-white"
            >
              {t("settings.logout")}
            </button>
          </div>
        </SettingRow>
      </SettingSection>
    </div>
  );
}

// ─── 공통 컴포넌트 ───

function SettingSection({
  title,
  subtitle,
  children,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-pretendard text-[18px] font-medium text-foreground">
          {title}
        </h2>
        {subtitle && (
          <span className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
            {subtitle}
          </span>
        )}
      </div>
      <div
        className={`card-hairline rounded-lg divide-y divide-[var(--border)] overflow-hidden ${danger ? "border-[var(--accent)]/30" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div>
        <div className="font-pretendard text-[14px] text-foreground">
          {label}
        </div>
        {sublabel && (
          <div className="font-pretendard text-[11px] text-[var(--muted-foreground)] mt-0.5">
            {sublabel}
          </div>
        )}
      </div>
      <div className="flex shrink-0 justify-start sm:justify-end">
        {children}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex min-h-11 w-14 items-center justify-center rounded-full"
    >
      <span
        className={`absolute h-6 w-12 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      />
      <span
        className={`absolute left-1.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SegmentControl<T extends string | number>({
  options,
  value,
  onChange,
  testId,
  disabled = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg bg-[var(--border)]/30 p-1"
      data-testid={testId ? `${testId}-control` : undefined}
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          disabled={disabled}
          data-testid={
            testId ? `${testId}-option-${String(opt.value)}` : undefined
          }
          onClick={() => onChange(opt.value)}
          className={`min-h-10 rounded px-3 text-xs font-medium transition-colors sm:min-h-11 disabled:cursor-wait disabled:opacity-50 ${
            value === opt.value
              ? "bg-card text-[var(--accent)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
