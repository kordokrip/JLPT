// 강성호 · 2026-10-14: 합성 가입 테스트가 운영 회원 DB를 오염시키지 않도록 원격 기본 실행을 막는다.
export function assertQaTestTarget(base, reviewedReceipt) {
  if (!base) return;
  const url = new URL(base);
  if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid E2E target');
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return;
  if (reviewedReceipt && /^https:\/\/[a-f0-9]{8}\.nihongo-n3\.pages\.dev\/?$/.test(base)) return;
  throw new Error('Remote signup E2E is prohibited. Use isolated local D1 or the receipt-verified dedicated Preview suite; never Production.');
}
