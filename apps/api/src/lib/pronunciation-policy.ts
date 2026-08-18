/**
 * Runtime guard for the product-wide pronunciation policy.
 *
 * Google browser speech is the sole pronunciation path.  Any server-side R2
 * generation/read path must fail before it can make a provider or R2 request.
 */
export const R2_PRONUNCIATION_DISABLED_MESSAGE =
  'R2 발음 저장·생성·재생은 정책상 비활성입니다. Google 음성만 사용합니다.';

export function failClosedR2Pronunciation(): void {
  throw new Error(R2_PRONUNCIATION_DISABLED_MESSAGE);
}
