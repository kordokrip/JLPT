/**
 * i18n 초기화 — i18next + react-i18next
 * 기본 언어: 한국어 (ko)
 * 지원 언어: ko, ja, en
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ko from './ko';
import ja from './ja';
import en from './en';

export type SupportedLang = 'ko' | 'ja' | 'en';

export const SUPPORTED_LANGS: { code: SupportedLang; label: string; native: string }[] = [
  { code: 'ko', label: '한국어',   native: '한국어' },
  { code: 'ja', label: '日本語',   native: '日本語' },
  { code: 'en', label: 'English', native: 'English' },
];

// localStorage에서 저장된 언어 읽기 (settings-store와 동기화)
function getInitialLang(): SupportedLang {
  try {
    const raw = localStorage.getItem('nihongo-n3-settings');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { language?: string } };
      const lang = parsed?.state?.language;
      if (lang === 'ko' || lang === 'ja' || lang === 'en') return lang;
    }
  } catch {
    // ignore
  }
  return 'ko';
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      ja: { translation: ja },
      en: { translation: en },
    },
    lng:           getInitialLang(),
    fallbackLng:   'ko',
    interpolation: { escapeValue: false },
    // 개발 환경에서 누락된 키 경고
    saveMissing:   import.meta.env.DEV,
  });

export default i18n;
