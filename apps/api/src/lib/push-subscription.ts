import type { PushSubscription } from './push.js';

const MAX_ENDPOINT_LENGTH = 4096;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function base64urlBytes(value: string): Uint8Array | null {
  if (!BASE64URL.test(value)) return null;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const canonical = btoa(String.fromCharCode(...bytes))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return canonical === value ? bytes : null;
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
    || (host.endsWith('.notify.windows.com') && path === '/' && endpoint.search.length > 1)
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
    || subscription.p256dh.length !== 87
    || subscription.auth.length !== 22
    || !allowedEndpoint(subscription.endpoint)
  ) return false;

  const p256dh = base64urlBytes(subscription.p256dh);
  const auth = base64urlBytes(subscription.auth);
  return p256dh?.length === 65 && p256dh[0] === 4 && auth?.length === 16;
}
