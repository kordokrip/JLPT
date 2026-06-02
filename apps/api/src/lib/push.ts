/**
 * apps/api/src/lib/push.ts
 *
 * Web Push 발송 — Workers 네이티브 Web Crypto API
 * RFC 7519 VAPID JWT  +  RFC 8291 aes128gcm 콘텐츠 암호화
 *
 * VAPID 키 형식:
 *   VAPID_PUBLIC_KEY:  base64url(65-byte uncompressed P-256 point)
 *   VAPID_PRIVATE_KEY: base64url(JSON.stringify(full ECDSA P-256 JWK))
 */

// ─── 공개 인터페이스 ───────────────────────────────────────────────────────

export interface PushSubscription {
  endpoint: string;
  p256dh:   string; // base64url 65-byte uncompressed P-256 point
  auth:     string; // base64url 16-byte random
}

export interface PushPayload {
  title:  string;
  body:   string;
  icon?:  string;
  badge?: string;
  url?:   string;
  tag?:   string;
}

// ─── バイト列ヘルパー ─────────────────────────────────────────────────────

function b64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin    = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total  = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset   = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

// ─── VAPID JWT ────────────────────────────────────────────────────────────

async function buildVapidAuth(
  endpoint:       string,
  vapidPublicKey: string,
  vapidPrivateKey: string,  // base64url(JSON-JWK)
): Promise<string> {
  // private key: base64url-encoded JSON of full ECDSA P-256 JWK
  const jwkJson  = new TextDecoder().decode(b64urlToBytes(vapidPrivateKey));
  const privateJwk: JsonWebKey = JSON.parse(jwkJson);

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const origin  = new URL(endpoint).origin;
  const nowSec  = Math.floor(Date.now() / 1000);
  const enc     = new TextEncoder();
  const toB64   = (obj: unknown) =>
    bytesToB64url(enc.encode(JSON.stringify(obj)));

  const header  = toB64({ alg: 'ES256', typ: 'JWT' });
  const payload = toB64({
    aud: origin,
    sub: 'mailto:admin@nihongo-n3.example.com',
    exp: nowSec + 43_200,
  });

  const sigInput = `${header}.${payload}`;
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      signingKey,
      enc.encode(sigInput),
    ),
  );

  const jwt = `${sigInput}.${bytesToB64url(sigBytes)}`;
  return `vapid t=${jwt},k=${vapidPublicKey}`;
}

// ─── RFC 8291 aes128gcm 메시지 암호화 ────────────────────────────────────

async function encryptPayload(
  plaintext:   string,
  subscription: PushSubscription,
): Promise<Uint8Array> {
  const enc  = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 수신자 공개키 (subscription.p256dh)
  const receiverPubKeyBytes = b64urlToBytes(subscription.p256dh);
  const authSecret          = b64urlToBytes(subscription.auth);

  const receiverPubKey = await crypto.subtle.importKey(
    'raw',
    receiverPubKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // 임시 ECDH 키쌍 생성
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  const senderPubKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeral.publicKey as CryptoKey) as ArrayBuffer,
  );

  // ECDH 공유 시크릿
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'ECDH', namedCurve: 'P-256', public: receiverPubKey } as any,
      ephemeral.privateKey as CryptoKey,
      256,
    ),
  );

  // RFC 8291 §3: IKM = HKDF(IKM=ecdh_secret, salt=auth, info=key_info, L=32)
  const keyInfo = concat(
    enc.encode('WebPush: info\x00'),
    receiverPubKeyBytes,
    senderPubKeyBytes,
  );
  const ecdhMaterial = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo },
      ecdhMaterial,
      256,
    ),
  );

  // CEK と Nonce を同じ IKM + salt から派生
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);

  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: concat(enc.encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1])),
      },
      ikmKey,
      128,
    ),
  );
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: concat(enc.encode('Content-Encoding: nonce\x00'), new Uint8Array([1])),
      },
      ikmKey,
      96,
    ),
  );

  // AES-128-GCM 암호화 (padding delimiter 0x02 = 마지막 레코드)
  const aesgcmKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const paddedPlain = concat(enc.encode(plaintext), new Uint8Array([2]));
  const ciphertext  = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesgcmKey, paddedPlain),
  );

  // aes128gcm 콘텐츠-인코딩 헤더 구성
  // [salt(16)] [rs(4 BE)] [idlen(1)] [keyid(65)] [ciphertext]
  const rs      = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([senderPubKeyBytes.length]), senderPubKeyBytes, ciphertext);
}

// ─── 공개 API ─────────────────────────────────────────────────────────────

export async function sendPushNotification(
  subscription:    PushSubscription,
  payload:         PushPayload,
  vapidPublicKey:  string,
  vapidPrivateKey: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const [authorization, body] = await Promise.all([
      buildVapidAuth(subscription.endpoint, vapidPublicKey, vapidPrivateKey),
      encryptPayload(JSON.stringify(payload), subscription),
    ]);

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL':              '86400',
        'Authorization':    authorization,
        'Urgency':          'normal',
      },
      body,
    });

    if (res.ok || res.status === 201) return { ok: true, status: res.status };
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

export async function sendPushToMany(
  subscriptions:   PushSubscription[],
  payload:         PushPayload,
  vapidPublicKey:  string,
  vapidPrivateKey: string,
): Promise<{ sent: number; failed: number; expired: string[] }> {
  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  for (const sub of subscriptions) {
    const res = await sendPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey);
    if (res.ok) {
      sent++;
    } else {
      failed++;
      // 410 Gone = 구독 만료 → 삭제 대상
      if (res.status === 410 || res.status === 404) {
        expired.push(sub.endpoint);
      }
    }
  }
  return { sent, failed, expired };
}
