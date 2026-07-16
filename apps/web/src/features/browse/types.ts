export type ContentType = 'vocab' | 'grammar' | 'kanji' | 'homophones';

export const BROWSE_TABS: { key: ContentType }[] = [
  { key: 'vocab' },
  { key: 'grammar' },
  { key: 'kanji' },
  { key: 'homophones' },
];
export function normalizeContentType(type: string | undefined): ContentType {
  return type === 'vocab' || type === 'grammar' || type === 'kanji' || type === 'homophones'
    ? type
    : 'vocab';
}
