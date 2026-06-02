/**
 * apps/web/src/sw-push.ts
 *
 * Service Worker push / notificationclick 이벤트 핸들러
 * vite-plugin-pwa generateSW 모드의 additionalManifestEntries 에 포함되지 않음.
 * 대신 workbox.importScripts 또는 injectManifest 모드로 이전 시 사용.
 *
 * 현재: vite.config.ts > VitePWA > workbox.runtimeCaching 과 함께
 *       workbox-window 의 push 이벤트를 직접 등록하는 대신,
 *       아래 코드를 vite.config.ts additionalManifestEntries로 bundled SW에 포함.
 *
 * NOTE: generateSW 모드에서는 커스텀 SW 코드를 직접 삽입하기 위해
 *       additional-sw 패턴을 사용합니다.
 */

// TypeScript용 ServiceWorker 글로벌 선언
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string; tag?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'JLPT N3', body: event.data?.text() ?? '새 알림이 있습니다.' };
  }

  const title   = data.title  ?? 'JLPT N3 일본어 학습';
  const options: NotificationOptions = {
    body:  data.body  ?? '학습 알림이 도착했습니다.',
    icon:  data.icon  ?? '/pwa-192x192.png',
    badge: data.badge ?? '/pwa-192x192.png',
    tag:   data.tag   ?? 'nihongo-notification',
    data:  { url: data.url ?? '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? '/';

  event.waitUntil(
    (self.clients.matchAll({ type: 'window', includeUncontrolled: true }) as Promise<WindowClient[]>).then(
      (clientList) => {
        const existing = clientList.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      },
    ),
  );
});
