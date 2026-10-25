import type { PushSubscription } from './push.js';

const MAX_ENDPOINT_LENGTH = 4096;
const BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;

function base64urlBytes(value: string): Uint8Array | null {
  if (!BASE64.test(value)) return null;
  try {
    const unpadded = value.replace(/=+$/, '');
    const padding = '='.repeat((4 - unpadded.length % 4) % 4);
    const padded = unpadded.replace(/-/g, '+').replace(/_/g, '/') + padding;
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const standard = btoa(String.fromCharCode(...bytes));
    const url = standard.replace(/\+/g, '-').replace(/\//g, '_');
    // 기존 클라이언트의 padded Base64와 브라우저 JSON의 Base64url 모두 보존한다.
    return [standard, url, standard.replace(/=+$/, ''), url.replace(/=+$/, '')].includes(value) ? bytes : null;
  } catch {
    return null;
  }
}

function allowedEndpoint(value: string): boolean {
  if (value.length > MAX_ENDPOINT_LENGTH) return false;
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return false;
  }

  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port || endpoint.hash) return false;

  const host = endpoint.hostname.toLowerCase();
  const path = endpoint.pathname;
  // Chromium (FCM), Firefox (Autopush), and Safari's documented push service.
  return (
    (host === 'fcm.googleapis.com' && (path.startsWith('/fcm/send/') || path.startsWith('/wp/')))
    || (host === 'jmt17.google.com' && path.startsWith('/fcm/send/'))
    || (host === 'updates.push.services.mozilla.com' && (path.startsWith('/wpush/v1/') || path.startsWith('/wpush/v2/')))
    || ((host === 'push.apple.com' || host.endsWith('.push.apple.com')) && path.length > 1)
    || (host.endsWith('.notify.windows.com') && ['/', '/w/'].includes(path) && endpoint.search.length > 1)
  );
}

/** Validates browser input before D1, WebCrypto, or fetch can consume it. */
export function isValidPushSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== 'object') return false;
  const subscription = value as Partial<PushSubscription>;
  if (
    typeof subscription.endpoint !== 'string'
    || typeof subscription.p256dh !== 'string'
    || typeof subscription.auth !== 'string'
    || subscription.p256dh.length < 87 || subscription.p256dh.length > 88
    || subscription.auth.length < 22 || subscription.auth.length > 24
    || !allowedEndpoint(subscription.endpoint)
  ) return false;

  const p256dh = base64urlBytes(subscription.p256dh);
  const auth = base64urlBytes(subscription.auth);
  return p256dh?.length === 65 && p256dh[0] === 4 && auth?.length === 16;
}
