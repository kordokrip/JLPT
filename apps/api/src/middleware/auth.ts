/**
 * apps/api/src/middleware/auth.ts
 *
 * Cloudflare Access JWT 검증 미들웨어.
 *
 * 흐름:
 *   1. ENVIRONMENT !== 'production' 또는 AUTH_MODE=public-owner → owner bypass
 *   2. Cf-Access-Jwt-Assertion 헤더에서 JWT 추출
 *   3. CF Access JWKS 엔드포인트에서 공개키 조회 (메모리 캐시 1h)
 *   4. RS256 서명 검증 + exp + aud 클레임 확인
 *   5. context.set('userId', sub), context.set('userEmail', email)
 *   6. D1에 사용자 행이 없으면 INSERT OR IGNORE로 자동 생성
 */
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';

// ─────────────────────────────────────────────
// JWT 내부 타입
// ─────────────────────────────────────────────
interface JwtHeader {
  kid?: string;
  alg?: string;
}

interface CfAccessPayload {
  sub: string;
  email: string;
  aud: string[];
  iat: number;
  exp: number;
  iss: string;
}

// ─────────────────────────────────────────────
// JWKS 캐시 (Worker 인스턴스 생애 동안 유지)
// ─────────────────────────────────────────────
let _keyCache: Map<string, CryptoKey> | null = null;
let _keyCachedAt = 0;
const KEY_TTL_MS = 3_600_000; // 1시간

async function fetchPublicKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const now = Date.now();
  if (_keyCache && now - _keyCachedAt < KEY_TTL_MS) return _keyCache;

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    cf: { cacheTtl: 3600 },
  } as RequestInit);

  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const jwks = await res.json<{ keys: JsonWebKey[] }>();

  const map = new Map<string, CryptoKey>();
  for (const jwk of jwks.keys) {
    const kid = (jwk as { kid?: string }).kid;
    if (!kid) continue;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    map.set(kid, key);
  }

  _keyCache = map;
  _keyCachedAt = now;
  return map;
}

// ─────────────────────────────────────────────
// JWT 파싱 / 검증 헬퍼
// ─────────────────────────────────────────────
function fromBase64url(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const full = padded + '=='.slice(0, (4 - (padded.length % 4)) % 4);
  return Uint8Array.from(atob(full), (c) => c.charCodeAt(0));
}

function parseB64(b64: string): unknown {
  const bytes = fromBase64url(b64);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function verifyJwt(
  token: string,
  keys: Map<string, CryptoKey>,
  aud: string,
): Promise<CfAccessPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT 형식 오류');

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  const header = parseB64(headerB64) as JwtHeader;
  if (!header.kid) throw new Error('JWT kid 누락');

  const key = keys.get(header.kid);
  if (!key) throw new Error(`알 수 없는 kid: ${header.kid}`);

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = fromBase64url(sigB64);

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data);
  if (!valid) throw new Error('JWT 서명 검증 실패');

  const payload = parseB64(payloadB64) as CfAccessPayload;
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.exp < nowSec) throw new Error('JWT 만료됨');
  if (!Array.isArray(payload.aud) || !payload.aud.includes(aud)) {
    throw new Error('JWT audience 불일치');
  }

  return payload;
}

// ─────────────────────────────────────────────
// 미들웨어 함수
// ─────────────────────────────────────────────
export async function cfAccessAuth(
  c: Context<AppEnv>,
  next: Next,
): Promise<Response | void> {
  // ── 개발/단일 사용자 운영 우회 ─────────────────
  // Cloudflare Access가 아직 연결되지 않은 운영 배포에서는 앱의 핵심 학습
  // 흐름이 500으로 막히지 않도록 명시적 public-owner 모드로 owner 계정을 사용한다.
  // Access 설정이 완료되면 AUTH_MODE=cf-access로 전환한다.
  if (c.env.ENVIRONMENT !== 'production' || c.env.AUTH_MODE === 'public-owner') {
    c.set('userId', 'owner');
    c.set('userEmail', 'owner@nihongo-n3.local');
    await next();
    return;
  }

  // ── JWT 추출 ───────────────────────────────
  if (
    !c.env.CF_ACCESS_AUD ||
    !c.env.CF_TEAM_DOMAIN ||
    c.env.CF_ACCESS_AUD.includes('__') ||
    c.env.CF_TEAM_DOMAIN.includes('__')
  ) {
    c.header('Content-Type', 'application/problem+json');
    return c.json(
      {
        type: 'https://nihongo-n3.example.com/errors/access-not-configured',
        title: 'Access Not Configured',
        status: 500,
        detail: 'Cloudflare Access AUD 또는 team domain이 설정되지 않았습니다',
      },
      500,
    );
  }

  const token = c.req.header('Cf-Access-Jwt-Assertion');
  if (!token) {
    c.header('Content-Type', 'application/problem+json');
    return c.json(
      {
        type: 'https://nihongo-n3.example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Cf-Access-Jwt-Assertion 헤더가 없습니다',
      },
      401,
    );
  }

  // ── 검증 ──────────────────────────────────
  try {
    const keys = await fetchPublicKeys(c.env.CF_TEAM_DOMAIN);
    const payload = await verifyJwt(token, keys, c.env.CF_ACCESS_AUD);

    c.set('userId', payload.sub);
    c.set('userEmail', payload.email);

    // ── 사용자 자동 등록 ─────────────────────
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name)
       VALUES (?, ?, ?)`,
    )
      .bind(payload.sub, payload.email, payload.email.split('@')[0] ?? payload.sub)
      .run();

    await next();
  } catch (err) {
    c.header('Content-Type', 'application/problem+json');
    return c.json(
      {
        type: 'https://nihongo-n3.example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: err instanceof Error ? err.message : '토큰 검증 실패',
      },
      401,
    );
  }
}
