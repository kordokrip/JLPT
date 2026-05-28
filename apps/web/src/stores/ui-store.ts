/**
 * Zustand UI 상태 스토어 — 모달, 사이드패널, 토스트 등
 */
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface UiState {
  // 네비게이션
  sideNavOpen: boolean;
  toggleSideNav: () => void;

  // 모달
  activeModal: string | null;
  openModal:   (id: string) => void;
  closeModal:  () => void;

  // 토스트
  toasts:     Toast[];
  addToast:   (message: string, variant?: Toast['variant']) => void;
  removeToast:(id: string) => void;

  // 온라인 상태
  isOnline: boolean;
  setOnline: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sideNavOpen: false,
  toggleSideNav: () => set((s) => ({ sideNavOpen: !s.sideNavOpen })),

  activeModal: null,
  openModal:   (id) => set({ activeModal: id }),
  closeModal:  () => set({ activeModal: null }),

  toasts: [],
  addToast: (message, variant = 'info') =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: crypto.randomUUID(), message, variant },
      ].slice(-5), // 최대 5개
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  isOnline: navigator.onLine,
  setOnline: (v) => set({ isOnline: v }),
}));
