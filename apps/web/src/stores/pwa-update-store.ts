// 강성호 2026-10-13: 새 버전 대기/이미 활성화 상태를 구분하고 중복 클릭·실패를 보존한다.
import { create } from "zustand";
type Action = () => void | Promise<void>;
interface UpdateState {
  available: boolean;
  open: boolean;
  applying: boolean;
  error: string | null;
  action: Action | null;
  show: (action: Action) => void;
  dismiss: () => void;
  reopen: () => void;
  apply: () => Promise<void>;
}
export const usePwaUpdateStore = create<UpdateState>((set, get) => ({
  available: false,
  open: false,
  applying: false,
  error: null,
  action: null,
  show: (action) =>
    set((state) => ({
      available: true,
      action,
      open: state.available ? state.open : true,
      error: null,
      applying: false,
    })),
  dismiss: () => set({ open: false }),
  reopen: () => set({ open: true }),
  apply: async () => {
    const state = get();
    if (state.applying || !state.action) return;
    set({ applying: true, error: null });
    try {
      sessionStorage.setItem("pwa-approved-reload", "1");
    } catch {
      /* 메모리 상태만으로도 명시적 동의는 유효하다. */
    }
    try {
      await state.action();
    } catch (error) {
      try {
        sessionStorage.removeItem("pwa-approved-reload");
      } catch {
        /* 저장소가 막혀도 다시 시도할 수 있다. */
      }
      set({
        applying: false,
        error: error instanceof Error ? error.message : "update-failed",
      });
    }
  },
}));
export function announceLoadedPwaRelease(
  release: string,
  controlled: boolean,
  reload: Action = () => window.location.reload(),
): void {
  try {
    const seen = localStorage.getItem("pwa-seen-release"),
      approved = sessionStorage.getItem("pwa-approved-reload") === "1";
    sessionStorage.removeItem("pwa-approved-reload");
    localStorage.setItem("pwa-seen-release", release);
    // 구 자동갱신 앱에서 새 앱으로 전환된 뒤의 최초 안내. 이미 동의해 갱신한 경우 재차 모달을 띄우지 않는다.
    if (controlled && seen !== release && !approved)
      usePwaUpdateStore.getState().show(reload);
  } catch {
    /* 저장소 비허용 환경에서는 waiting/controllerchange의 실제 업데이트 알림만 사용한다. */
  }
}
