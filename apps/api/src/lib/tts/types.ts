/**
 * apps/api/src/lib/tts/types.ts
 *
 * TTS 어댑터 공통 인터페이스
 */

export interface TtsOptions {
  text:  string;
  lang:  'ja' | 'en';
  /** 재생 속도 (0.5~2.0, 기본 1.0) */
  rate?: number;
  /** 음성 선택 (공급자별 다름) */
  voice?: string;
}

export interface TtsAdapter {
  generateAudio(opts: TtsOptions): Promise<ArrayBuffer>;
}
