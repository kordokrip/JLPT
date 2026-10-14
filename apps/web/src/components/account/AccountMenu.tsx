import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Camera, ChevronRight, LogOut, Settings, Users, X } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/auth-store";
import { accountApi } from "../../lib/account-api";
import { AvatarEditor } from "./AvatarEditor";
import { DevicePushStatus } from "./DevicePushStatus";

function initials(name?: string | null, email?: string | null) {
  return (name || email || "?").trim().slice(0, 2).toUpperCase();
}
function Avatar({
  image,
  user,
  size = "h-9 w-9",
}: {
  image: string | null;
  user: { display_name?: string | null; email?: string | null };
  size?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return image && !failed ? (
    <img
      alt=""
      src={image}
      onError={() => setFailed(true)}
      className={`${size} rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${size} inline-flex items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]`}
    >
      {initials(user.display_name, user.email)}
    </span>
  );
}

export function AccountMenu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const labels = i18n.language.startsWith("ja")
    ? {
        close: "閉じる",
        design: "アプリのデザイン",
        notifications: "通知設定",
        load: "写真を読み込めませんでした。",
      }
    : i18n.language.startsWith("en")
      ? {
          close: "Close",
          design: "App appearance",
          notifications: "Notification settings",
          load: "Could not load photo.",
        }
      : {
          close: "닫기",
          design: "앱 디자인",
          notifications: "알림 설정",
          load: "사진을 불러오지 못했습니다.",
        };
  const photoSpec =
    document.documentElement.lang === "ja"
      ? "JPEG、256 × 256、128 KiB 以下"
      : document.documentElement.lang === "en"
        ? "JPEG, 256 × 256, ≤128 KiB"
        : "JPEG, 256 × 256, 128 KiB 이하";
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const track = useSettingsStore((state) => state.learningTrack);
  const accent = useSettingsStore((state) => state.accent);
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const owner = useRef<string | null>(null);
  const photoRequest = useRef(0);
  useEffect(() => {
    let disposed = false;
    const id = user?.id ?? null;
    owner.current = id;
    const request = ++photoRequest.current;
    setPhotoError(false);
    setOpen(false);
    if (avatar?.startsWith("blob:")) URL.revokeObjectURL(avatar);
    setAvatar(null);
    if (!id || !user?.avatar_updated_at) return;
    void accountApi
      .avatar(id)
      .then((blob) => {
        if (
          !disposed &&
          owner.current === id &&
          request === photoRequest.current &&
          blob
        )
          setAvatar(URL.createObjectURL(blob));
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.avatar_updated_at]);
  useEffect(
    () => () => {
      if (avatar?.startsWith("blob:")) URL.revokeObjectURL(avatar);
    },
    [avatar],
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
      if (event.key === "Tab" && panel.current) {
        const nodes = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]):not([type="file"])',
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = document.getElementById("root");
    const wasInert = root?.inert;
    if (root) root.inert = true;
    return () => {
      document.body.style.overflow = previous;
      if (root) root.inert = wasInert ?? false;
      trigger.current?.focus();
    };
  }, [open]);
  if (!user) return null;
  const visibleAvatar = (owner.current === user.id ? avatar : null) ?? user.google_picture_url ?? null;
  const refreshUploadedAvatar = async () => {
    const id = user.id;
    const request = ++photoRequest.current;
    try {
      const blob = await accountApi.avatar(id);
      if (owner.current !== id || request !== photoRequest.current) return;
      setAvatar(blob ? URL.createObjectURL(blob) : null);
    } catch {
      if (owner.current === id && request === photoRequest.current)
        setPhotoError(true);
    }
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("settings.account")}
        onClick={() => setOpen(true)}
        className="account-avatar-button"
      >
        <Avatar image={visibleAvatar} user={user} />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/30"
            data-learning-track={track}
            data-account-accent={accent}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={t("settings.account")}
              className="account-menu"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <Avatar image={visibleAvatar} user={user} size="h-12 w-12" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {user.display_name || user.email}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {user.email}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {track === "jlpt-ja"
                      ? t("settings.jlptTrack")
                      : t("settings.topikTrack")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={labels.close}
                  className="account-action ml-auto"
                  onClick={() => setOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="py-3">
                <AvatarEditor
                  key={user.id}
                  userId={user.id}
                  onChange={() => {
                    setPhotoError(false);
                    void refreshUploadedAvatar();
                  }}
                />
              </div>
              {photoError && <p role="alert">{labels.load}</p>}
              <DevicePushStatus key={user.id} userId={user.id} />
              <div className="space-y-1 border-t border-[var(--border)] pt-3">
                <Link
                  to="/settings#appearance"
                  onClick={() => setOpen(false)}
                  className="account-menu-link"
                >
                  <Settings size={17} />
                  {labels.design}
                  <ChevronRight className="ml-auto" size={16} />
                </Link>
                <Link
                  to="/settings#notifications"
                  onClick={() => setOpen(false)}
                  className="account-menu-link"
                >
                  <Settings size={17} />
                  {labels.notifications}
                  <ChevronRight className="ml-auto" size={16} />
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="account-menu-link"
                >
                  <Settings size={17} />
                  {t("nav.settings")}
                  <ChevronRight className="ml-auto" size={16} />
                </Link>
                {user.role === "admin" && (
                  <Link
                    to="/admin/users"
                    onClick={() => setOpen(false)}
                    className="account-menu-link"
                  >
                    <Users size={17} />
                    {t("nav.adminUsers")}
                    <ChevronRight className="ml-auto" size={16} />
                  </Link>
                )}
                <button
                  type="button"
                  className="account-menu-link w-full"
                  onClick={() =>
                    void logout().then(() =>
                      navigate("/welcome", { replace: true }),
                    )
                  }
                >
                  <LogOut size={17} />
                  {t("nav.logout")}
                </button>
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <Camera size={13} /> {photoSpec}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
