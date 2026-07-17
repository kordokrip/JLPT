import type { VocabItem } from '../../lib/db';
import type { ReviewScreen } from './types';

export function starterVocabIds(items: Pick<VocabItem, 'id'>[], limit = 10): number[] {
  return items.slice(0, limit).map((item) => item.id);
}

export function reviewScreen(cardCount: number, reviewed: number): ReviewScreen {
  if (cardCount === 0 && reviewed > 0) return 'complete';
  if (cardCount === 0) return 'empty';
  return 'active';
}

export function reviewTotal(cardCount: number, reviewed: number): number {
  return cardCount + reviewed;
}
