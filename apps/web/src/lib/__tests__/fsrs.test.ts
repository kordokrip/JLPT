import { describe, it, expect } from 'vitest';
import { schedule, isDue, createNewCard } from '../../lib/fsrs-client';

describe('FSRS 스케줄링', () => {
  it('새 카드의 state는 new이다', () => {
    const card = createNewCard();
    expect(card.state).toBe('new');
  });

  it('good 평가 후 dueAt이 now 이후이다', () => {
    const card = createNewCard();
    const now = new Date();
    const result = schedule(card, 'good', now);
    expect(result.dueAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('again 평가 후 state가 올바른 범위이다', () => {
    const card = createNewCard();
    const result = schedule(card, 'again');
    expect(['learning', 'relearning', 'new']).toContain(result.state);
  });

  it('easy 평가 후 dueAt이 good보다 더 미래이다', () => {
    const card = createNewCard();
    const now = new Date();
    const goodResult = schedule(card, 'good', now);
    const easyResult = schedule(card, 'easy', now);
    expect(easyResult.dueAt.getTime()).toBeGreaterThanOrEqual(goodResult.dueAt.getTime());
  });

  it('isDue: 과거 ISO 문자열은 true', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isDue(past)).toBe(true);
  });

  it('isDue: 미래 ISO 문자열은 false', () => {
    const future = new Date(Date.now() + 60_000_000).toISOString();
    expect(isDue(future)).toBe(false);
  });
});

