#!/usr/bin/env node
/**
 * scripts/gen-vapid.mjs
 *
 * VAPID 키쌍 생성 스크립트
 * 사용: node scripts/gen-vapid.mjs
 *
 * 출력:
 *   VAPID_PUBLIC_KEY=<base64url 65-byte uncompressed P-256 point>
 *   VAPID_PRIVATE_KEY=<base64url(JSON.stringify(full P-256 JWK))>
 *
 * Cloudflare Workers에 설정:
 *   wrangler secret put VAPID_PUBLIC_KEY
 *   wrangler secret put VAPID_PRIVATE_KEY
 */

const { subtle, getRandomValues } = globalThis.crypto;

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

const keyPair = await subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
);

const [publicRaw, privateJwk] = await Promise.all([
  subtle.exportKey('raw',  keyPair.publicKey),
  subtle.exportKey('jwk',  keyPair.privateKey),
]);

const VAPID_PUBLIC_KEY  = b64url(new Uint8Array(publicRaw));
const VAPID_PRIVATE_KEY = b64url(Buffer.from(JSON.stringify(privateJwk)));

console.log('\n=== VAPID Keys ===\n');
console.log(`VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}`);
console.log(`VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}`);
console.log('\n실행 명령:');
console.log(`  cd apps/api && echo "${VAPID_PUBLIC_KEY}"  | wrangler secret put VAPID_PUBLIC_KEY`);
console.log(`  cd apps/api && echo "${VAPID_PRIVATE_KEY}" | wrangler secret put VAPID_PRIVATE_KEY`);
console.log('\n클라이언트에도 PUBLIC KEY 등록:');
console.log(`  apps/web/.env.production 에 추가:`);
console.log(`  VITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}`);
