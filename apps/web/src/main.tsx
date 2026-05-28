import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import { initSync } from './lib/sync';
import { useUiStore } from './stores/ui-store';
import { useSettingsStore } from './stores/settings-store';

import App from './App';
import './index.css';
import './i18n'; // i18n 초기화 (앱 시작 전 로드)

// ─────────────────────────────────────────────
// Service Worker 등록 (vite-plugin-pwa 빌드 시 자동 생성)
// ─────────────────────────────────────────────
import i18n from './i18n';
const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm(i18n.t('pwa.updateAvailable'))) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.info('[PWA]', i18n.t('pwa.offlineReady'));
  },
});

// ─────────────────────────────────────────────
// TanStack Query 클라이언트
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─────────────────────────────────────────────
// 앱 렌더링
// ─────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

// ─────────────────────────────────────────────
// 다크모드 초기화 (렌더 전 적용)
// ─────────────────────────────────────────────
(function applyTheme() {
  const { theme } = useSettingsStore.getState();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.lang = i18n.language || 'ko';
})();

// ─────────────────────────────────────────────
// 온라인/오프라인 상태 구독
// ─────────────────────────────────────────────
window.addEventListener('online',  () => useUiStore.getState().setOnline(true));
window.addEventListener('offline', () => useUiStore.getState().setOnline(false));

// ─────────────────────────────────────────────
// Offline sync 초기화
// ─────────────────────────────────────────────
initSync();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
