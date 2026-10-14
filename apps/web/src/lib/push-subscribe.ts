/**
 * apps/web/src/lib/push-subscribe.ts
 *
 * Web Push 구독 관리 유틸리티
 *   - 사용자가 Settings 에서 알림 ON → Notification.requestPermission()
 *   - PushManager.subscribe()
 *   - 서버 /api/v1/notifications/subscribe 로 구독 정보 전송
 */

import { apiUrl } from './api-base';
import { useAuthStore } from '../stores/auth-store';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** base64url → Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export type NotificationPermission = 'granted' | 'denied' | 'default';

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission as NotificationPermission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const result = await Notification.requestPermission();
  return result as NotificationPermission;
}

export interface SubscribeOptions {
  morningOn?: boolean;
  eveningOn?: boolean;
  notificationLanguage?: 'ko' | 'ja' | 'en';
}

export async function subscribeToPush(opts: SubscribeOptions = {}): Promise<boolean> {
  const owner = useAuthStore.getState().user?.id;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY 미설정');
    return false;
  }

  try {
    const reg          = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });

    const key  = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!key || !auth) return false;

    const body = {
      endpoint:  subscription.endpoint,
      p256dh:    btoa(String.fromCharCode(...new Uint8Array(key as ArrayBuffer))),
      auth:      btoa(String.fromCharCode(...new Uint8Array(auth as ArrayBuffer))),
      morningOn: opts.morningOn ?? false,
      eveningOn: opts.eveningOn ?? false,
      notificationLanguage: opts.notificationLanguage,
    };

    if (useAuthStore.getState().user?.id !== owner) return false;
    const res = await fetch(apiUrl('/notifications/subscribe'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(owner ? {'X-Account-Id':owner} : {}) },
      credentials: 'include',
      body:    JSON.stringify(body),
    });

    return res.ok || res.status === 201;
  } catch (err) {
    console.error('[Push] subscribe 실패:', err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const owner = useAuthStore.getState().user?.id;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const reg          = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;

    if (useAuthStore.getState().user?.id !== owner) return false;
    const response = await fetch(apiUrl('/notifications/subscribe'), {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', ...(owner ? {'X-Account-Id':owner} : {}) },
      credentials: 'include',
      body:    JSON.stringify({ endpoint: subscription.endpoint }),
    });

    // Preserve the browser subscription when the server did not accept its
    // deletion.  A 404 is deliberately idempotent: the endpoint is already
    // absent server-side and it is safe to remove the device copy.
    if (!response.ok && response.status !== 404) return false;
    if (useAuthStore.getState().user?.id !== owner) return false;
    return await subscription.unsubscribe();
  } catch (err) {
    console.error('[Push] unsubscribe 실패:', err);
    return false;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}
