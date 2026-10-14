// 강성호 2026-10-13: 한국어/일본어 안내·키보드 포커스·명시적 새로고침. 학습/메모/로그인 화면은 보호한다.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useIsMutating } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { usePwaUpdateStore } from "../stores/pwa-update-store";
import { useUiStore } from "../stores/ui-store";
import { isPwaUpdateSafePath } from "../lib/pwa-update";

export function PwaUpdatePrompt() {
  const { t, i18n } = useTranslation(),
    { pathname } = useLocation(),
    mutating = useIsMutating();
  const state = usePwaUpdateStore(),
    online = useUiStore((s) => s.isOnline),
    dialog = useRef<HTMLDialogElement>(null),
    later = useRef<HTMLButtonElement>(null);
  const safe = isPwaUpdateSafePath(pathname) && mutating === 0;
  const primary = i18n.resolvedLanguage?.startsWith("ja")
    ? "ja"
    : i18n.resolvedLanguage?.startsWith("en")
      ? "en"
      : "ko";
  const second = primary === "ja" ? "ko" : "ja";
  const visible = state.available && state.open && safe;
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (visible && !element.open) {
      element.showModal();
      later.current?.focus();
    } else if (!visible && element.open) element.close();
  }, [visible]);
  if (!state.available) return null;
  const bilingual = (key: string) => (
    <>
      <span lang={primary}>{t(key, { lng: primary })}</span>
      <span lang={second} className="mt-1 block text-sm font-normal opacity-80">
        {t(key, { lng: second })}
      </span>
    </>
  );
  return (
    <>
      {!visible && (
        <button
          type="button"
          onClick={state.reopen}
          className="fixed right-3 bottom-[calc(var(--nav-height,4rem)_+_env(safe-area-inset-bottom)_+_1rem)] z-[60] max-w-[calc(100vw_-_1.5rem)] rounded-xl border border-[var(--border)] bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {bilingual(safe ? "pwa.updateTitle" : "pwa.updateWhenHome")}
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-body"
        onCancel={(event) => {
          event.preventDefault();
          if (!state.applying) state.dismiss();
        }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/40"
      >
        <RefreshCw aria-hidden="true" className="mb-4 h-7 w-7 text-primary" />
        <h2 id="pwa-update-title" className="text-xl font-bold leading-snug">
          {bilingual("pwa.updateTitle")}
        </h2>
        <p id="pwa-update-body" className="mt-4 text-base leading-relaxed">
          {bilingual("pwa.updateBody")}
        </p>
        {!online && (
          <p role="status" className="mt-3 text-base">
            {bilingual("pwa.updateOffline")}
          </p>
        )}
        {state.error && (
          <p
            role="alert"
            className="mt-3 text-base text-red-700 dark:text-red-300"
          >
            {bilingual(
              state.error === "active-learning"
                ? "pwa.updateOtherTab"
                : "pwa.updateFailed",
            )}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            disabled={!online || state.applying || !safe}
            onClick={() => void state.apply()}
            className="min-h-12 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-fg disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {bilingual(state.applying ? "pwa.updating" : "pwa.updateAction")}
          </button>
          <button
            ref={later}
            type="button"
            disabled={state.applying}
            onClick={state.dismiss}
            className="min-h-12 rounded-xl border border-[var(--border)] px-4 py-3 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {bilingual("pwa.updateLater")}
          </button>
        </div>
      </dialog>
    </>
  );
}
