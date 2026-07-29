/**
 * apps/web/src/sw.ts
 *
 * Service Worker — injectManifest 모드 (vite-plugin-pwa)
 *
 * - Precache: self.__WB_MANIFEST (빌드 시 vite-plugin-pwa가 주입)
 * - Runtime caching: 오디오, 콘텐츠 API
 * - Push 알림: 아침/저녁 복습 알림
 * - notificationclick: 알림 클릭 → 앱 포커스 또는 새 창
 */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  NetworkOnly,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin }        from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// ── SW 업데이트 시 즉시 활성화 ───────────────────────────────────────
self.skipWaiting();
clientsClaim();

// ── 구버전 캐시 정리 ─────────────────────────────────────────────────
cleanupOutdatedCaches();

// ── Precache + Navigate Fallback ─────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  }),
);

// ── Runtime Caching ──────────────────────────────────────────────────

// Owner-private release responses are authentication-bound. Never place them
// in the Service Worker cache, even if a future broad API caching rule appears.
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/tracks/topik-ko/owner-private/')
    || url.pathname.includes('/api/v1/admin/topik-owner-private/'),
  new NetworkOnly(),
);

// Audio objects are fetched from private R2 through an authenticated endpoint.
// Do not cache them in the Service Worker: a device-local cache is never an
// access-control boundary and must not outlive the authenticated session.
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/audio/'),
  new NetworkOnly(),
);

// 콘텐츠 API (어휘·문법·한자·예문·커리큘럼): StaleWhileRevalidate
registerRoute(
  ({ url }) => /\/(vocab|grammar|kanji|sentences|curriculum)/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'nihongo-content',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ── Push 알림 ─────────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let data: {
    title?: string; body?: string;
    icon?: string; badge?: string;
    url?: string; tag?: string;
  } = {};
  try {
    data = event.data ? (event.data.json() as typeof data) : {};
  } catch {
    data = { title: 'JLPT · TOPIK Study', body: event.data?.text() ?? '새 학습 알림이 있습니다.' };
  }

  const title   = data.title ?? 'JLPT · TOPIK Study';
  const options: NotificationOptions = {
    body:   data.body   ?? '학습 알림이 도착했습니다.',
    icon:   data.icon   ?? '/pwa-192x192.png',
    badge:  data.badge  ?? '/pwa-192x192.png',
    tag:    data.tag    ?? 'language-study-notification',
    data:   { url: data.url ?? '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 알림 클릭 ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string | undefined) ?? '/';

  event.waitUntil(
    (
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }) as Promise<WindowClient[]>
    ).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
