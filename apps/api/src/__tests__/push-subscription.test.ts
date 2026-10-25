import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidPushSubscription } from '../lib/push-subscription.js';
import { sendPushNotification } from '../lib/push.js';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const validKeys = () => ({
  p256dh: b64url(Uint8Array.from([4, ...new Uint8Array(64).fill(1)])),
  auth: b64url(new Uint8Array(16).fill(2)),
});
const subscription = (endpoint: string, keys = validKeys()) => ({ endpoint, ...keys });

afterEach(() => vi.unstubAllGlobals());

describe('Web Push subscription boundary', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/token',
    'https://fcm.googleapis.com/wp/token',
    'https://jmt17.google.com/fcm/send/token',
    'https://updates.push.services.mozilla.com/wpush/v1/token',
    'https://updates.push.services.mozilla.com/wpush/v2/token',
    'https://web.push.apple.com/token',
    'https://wns2-example.notify.windows.com/?token=synthetic',
    'https://wns2-example.notify.windows.com/w/?token=synthetic',
  ])('accepts a supported provider endpoint: %s', (endpoint) => {
    expect(isValidPushSubscription(subscription(endpoint))).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/token',
    'https://user@fcm.googleapis.com/fcm/send/token',
    'https://fcm.googleapis.com:444/fcm/send/token',
    'https://fcm.googleapis.com/fcm/send/token#fragment',
    'https://127.0.0.1/fcm/send/token',
    'https://fcm.googleapis.com.attacker.test/fcm/send/token',
    'https://wns2-example.notify.windows.com.attacker.test/?token=synthetic',
    'https://fcm.googleapis.com/fcm/send/token'.padEnd(4097, 'x'),
  ])('rejects unsafe endpoint: %s', (endpoint) => {
    expect(isValidPushSubscription(subscription(endpoint))).toBe(false);
  });

  it('rejects malformed, non-canonical, and wrong-size key material', () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/token';
    expect(isValidPushSubscription(subscription(endpoint, { p256dh: b64url(new Uint8Array(65).fill(1)), auth: b64url(new Uint8Array(16)) }))).toBe(false);
    expect(isValidPushSubscription(subscription(endpoint, { p256dh: b64url(Uint8Array.from([4, ...new Uint8Array(64)])) + '==', auth: b64url(new Uint8Array(16)) }))).toBe(false);
    expect(isValidPushSubscription(subscription(endpoint, { p256dh: b64url(Uint8Array.from([4, ...new Uint8Array(64)])), auth: b64url(new Uint8Array(15)) }))).toBe(false);
  });

  it('preserves existing padded standard Base64 and padded Base64url subscriptions', () => {
    const standard = {
      p256dh: btoa(String.fromCharCode(4, ...new Uint8Array(64).fill(251))),
      auth: btoa(String.fromCharCode(...new Uint8Array(16).fill(255))),
    };
    expect(isValidPushSubscription(subscription('https://web.push.apple.com/synthetic', standard))).toBe(true);
    expect(isValidPushSubscription(subscription('https://web.push.apple.com/synthetic', {
      p256dh: standard.p256dh.replace(/\+/g, '-').replace(/\//g, '_'),
      auth: standard.auth.replace(/\+/g, '-').replace(/\//g, '_'),
    }))).toBe(true);
  });

  it('does not fetch an invalid stored subscription', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendPushNotification(
      subscription('https://169.254.169.254/latest/meta-data'),
      { title: 'x', body: 'x' },
      'not-used',
      'not-used',
    )).resolves.toMatchObject({ ok: false, status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
