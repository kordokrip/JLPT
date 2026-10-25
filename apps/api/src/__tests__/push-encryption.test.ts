import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendPushNotification, type PushPayload } from '../lib/push.js';

const encoder = new TextEncoder();
const join = (...parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// Independent receiver: implement the RFC 8291 section 3.4 HMAC steps,
// deliberately without WebCrypto HKDF or any sender-internal helper.
async function hmac(key: Uint8Array, data: Uint8Array) {
  const imported = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', imported, data));
}

async function receiver() {
  const keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const publicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/synthetic-test', p256dh: encode(publicBytes), auth: encode(auth) },
    async decrypt(body: Uint8Array, authentication = auth) {
      expect(body.length).toBeGreaterThan(102);
      expect(new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(16)).toBe(4096);
      expect(body[20]).toBe(65);
      const salt = body.slice(0, 16), senderBytes = body.slice(21, 86);
      expect(senderBytes[0]).toBe(4);
      const sender = await crypto.subtle.importKey('raw', senderBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      const agreement = { name: 'ECDH', public: sender };
      const shared = new Uint8Array(await crypto.subtle.deriveBits(agreement, keys.privateKey, 256));
      const prkKey = await hmac(authentication, shared);
      const ikm = await hmac(prkKey, join(encoder.encode('WebPush: info\0'), publicBytes, senderBytes, new Uint8Array([1])));
      const prk = await hmac(salt, ikm);
      const cek = (await hmac(prk, join(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
      const nonce = (await hmac(prk, join(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
      const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
      const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, body.slice(86)));
      expect(plaintext[plaintext.length - 1]).toBe(2);
      return JSON.parse(new TextDecoder().decode(plaintext.slice(0, -1)));
    },
  };
}

async function fixture() {
  const ua = await receiver();
  const vapid = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const vapidPublic = encode(new Uint8Array(await crypto.subtle.exportKey('raw', vapid.publicKey) as ArrayBuffer));
  const vapidPrivate = encode(encoder.encode(JSON.stringify(await crypto.subtle.exportKey('jwk', vapid.privateKey))));
  const requests: Request[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return new Response(null, { status: 201 });
  }));
  return {
    ua, vapid, vapidPublic, requests,
    async send(payload: PushPayload) {
      expect(await sendPushNotification(ua.subscription, payload, vapidPublic, vapidPrivate)).toEqual({ ok: true, status: 201 });
      return requests[requests.length - 1]!;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('Web Push standards interoperability (synthetic receiver, no real delivery)', () => {
  it('checks the independent HMAC derivation against RFC 8291 Appendix A known answers', async () => {
    // Published test-vector values, not application credentials.
    const ua = decode('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4');
    const sender = decode('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
    const prkKey = await hmac(decode('BTBZMqHH6r4Tts7J_aSIgg'), decode('kyrL1jIIOHEzg3sM2ZWRHDRB62YACZhhSlknJ672kSs'));
    expect(encode(prkKey)).toBe('Snr3JMxaHVDXHWJn5wdC52WjpCtd2EIEGBykDcZW32k');
    const ikm = await hmac(prkKey, join(encoder.encode('WebPush: info\0'), ua, sender, new Uint8Array([1])));
    expect(encode(ikm)).toBe('S4lYMb_L0FxCeq0WhDx813KgSYqU26kOyzWUdsXYyrg');
    const prk = await hmac(decode('DGv6ra1nlYgDCS1FRnbzlw'), ikm);
    expect(encode(prk)).toBe('09_eUZGrsvxChDCGRCdkLiDXrReGOEVeSCdCcPBSJSc');
    expect(encode((await hmac(prk, join(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16))).toBe('oIhVW04MRdy2XN9CiKLxTg');
    expect(encode((await hmac(prk, join(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12))).toBe('4h_95klXJ5E_qnoN');
  });

  it('decrypts the actual outgoing aes128gcm body with an independent RFC 8291 receiver', async () => {
    const f = await fixture();
    const payload = { title: '오늘의 복습 · 今日の復習', body: '다시 만나서 반가워요。復習しましょう。', url: '/review', tag: 'daily-reminder-custom' };
    const request = await f.send(payload);
    expect(request.url).toBe(f.ua.subscription.endpoint);
    expect(request.method).toBe('POST');
    expect(request.headers.get('Content-Encoding')).toBe('aes128gcm');
    expect(request.headers.get('Content-Type')).toBe('application/octet-stream');
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });
    expect(await f.ua.decrypt(new Uint8Array(await request.arrayBuffer()))).toEqual(payload);
  });

  it('authenticates the ciphertext and subscription secret', async () => {
    const f = await fixture();
    const payload = { title: 'Integrity', body: 'Private reminder' };
    const body = new Uint8Array(await (await f.send(payload)).arrayBuffer());
    expect(await f.ua.decrypt(body)).toEqual(payload);
    const tampered = body.slice();
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 1;
    await expect(f.ua.decrypt(tampered)).rejects.toThrow();
    await expect(f.ua.decrypt(body, new Uint8Array(16))).rejects.toThrow();
  });

  it('uses a fresh salt and ephemeral ECDH key for every message', async () => {
    const f = await fixture();
    const payload = { title: 'Fresh key', body: 'Same payload' };
    const first = new Uint8Array(await (await f.send(payload)).arrayBuffer());
    const second = new Uint8Array(await (await f.send(payload)).arrayBuffer());
    expect(first.slice(0, 16)).not.toEqual(second.slice(0, 16));
    expect(first.slice(21, 86)).not.toEqual(second.slice(21, 86));
    expect(await f.ua.decrypt(first)).toEqual(payload);
    expect(await f.ua.decrypt(second)).toEqual(payload);
  });

  it('independently verifies VAPID ES256 signature, audience, expiry and separate public key', async () => {
    const f = await fixture();
    const before = Math.floor(Date.now() / 1000);
    const request = await f.send({ title: 'VAPID', body: 'JWT verification' });
    const authorization = request.headers.get('Authorization')!;
    const match = /^vapid t=([^,]+),k=(.+)$/.exec(authorization)!;
    expect(match).not.toBeNull();
    expect(match[2]).toBe(f.vapidPublic);
    const [header, payload, signature] = match[1]!.split('.') as [string, string, string];
    expect(JSON.parse(new TextDecoder().decode(decode(header)))).toEqual({ alg: 'ES256', typ: 'JWT' });
    const claims = JSON.parse(new TextDecoder().decode(decode(payload))) as { aud: string; exp: number; sub: string };
    expect(claims.aud).toBe(new URL(f.ua.subscription.endpoint).origin);
    expect(claims.exp).toBeGreaterThan(before);
    expect(claims.exp).toBeLessThanOrEqual(before + 86400);
    expect(claims.sub).toMatch(/^(mailto:|https:\/\/)/);
    const signatureBytes = decode(signature);
    expect(signatureBytes.length).toBe(64);
    const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
    expect(await crypto.subtle.verify(algorithm, f.vapid.publicKey, signatureBytes, encoder.encode(`${header}.${payload}`))).toBe(true);
    expect(await crypto.subtle.verify(algorithm, f.vapid.publicKey, signatureBytes, encoder.encode(`${header}.${payload}x`))).toBe(false);
    const body = new Uint8Array(await request.arrayBuffer());
    expect(encode(body.slice(21, 86))).not.toBe(f.vapidPublic);
  });
});
