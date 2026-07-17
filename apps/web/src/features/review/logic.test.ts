import { describe, expect, it } from 'vitest';
import { reviewScreen, reviewTotal, starterVocabIds } from './logic';

describe('review feature logic', () => {
  it('limits starter cards to the first ten IDs in source order', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));

    expect(starterVocabIds(items)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('derives empty, active, and complete review screens without UI state', () => {
    expect(reviewScreen(0, 0)).toBe('empty');
    expect(reviewScreen(1, 0)).toBe('active');
    expect(reviewScreen(0, 3)).toBe('complete');
    expect(reviewTotal(4, 3)).toBe(7);
  });
});
