export type ContentType = 'vocab' | 'grammar' | 'kanji';

export const BROWSE_TABS: { key: ContentType }[] = [{ key: 'vocab' }, { key: 'grammar' }, { key: 'kanji' }];
export const BROWSE_LEVELS = ['N5', 'N4', 'N3'];

export function normalizeContentType(type: string | undefined): ContentType {
  return type === 'vocab' || type === 'grammar' || type === 'kanji' ? type : 'vocab';
}
