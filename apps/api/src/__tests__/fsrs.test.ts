/**
 * apps/api/src/__tests__/fsrs.test.ts
 *
 * FSRS-6 알고리즘 단위 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  schedule,
  type CardSnapshot,
} from '../lib/fsrs.js';

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────
function newCard(): CardSnapshot {
  return {
    state:          'new',
    stability:      0,
    difficulty:     0,
    lapses:         0,
    reps:           0,
    lastReviewedAt: null,
  };
}

function reviewCard(overrides?: Partial<CardSnapshot>): CardSnapshot {
  return {
    state:          'review',
    stability:      10,
    difficulty:     5,
    lapses:         0,
    reps:           5,
    lastReviewedAt: new Date(Date.now() - 10 * 86_400_000),
    ...overrides,
  };
}

/** ScheduleResult → 다음 CardSnapshot 변환 헬퍼 */
function toSnapshot(res: ReturnType<typeof schedule>, lastReviewedAt = new Date()): CardSnapshot {
  return {
    state:          res.state,
    stability:      res.stability,
    difficulty:     res.difficulty,
    lapses:         res.lapses,
    reps:           res.reps,
    lastReviewedAt,
  };
}

// ─────────────────────────────────────────────
// schedule() 핵심 시나리오
// ─────────────────────────────────────────────
describe('schedule() — new card', () => {
  it('again → state=learning, stability≈W[0]=0.212', () => {
    const res = schedule(newCard(), 'again');
    expect(res.state).toBe('learning');
    expect(res.stability).toBeCloseTo(0.212, 2);
    // learning 카드: dueAt ≈ now (분 단위 간격)
    expect(res.dueAt.getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  it('hard → state=learning', () => {
    const res = schedule(newCard(), 'hard');
    expect(res.state).toBe('learning');
  });

  it('good → state=learning (FSRS-6 멀티-스텝 유지)', () => {
    const res = schedule(newCard(), 'good');
    expect(res.state).toBe('learning');
  });

  it('easy → state=review (즉시 졸업), stability≈W[2]', () => {
    const res = schedule(newCard(), 'easy', new Date(), { enable_short_term: false });
    expect(res.state).toBe('review');
    expect(res.stability).toBeGreaterThan(0);
  });

  it('easy → state=review, dueAt이 now 이후', () => {
    const now = new Date();
    const res = schedule(newCard(), 'easy', now);
    expect(res.state).toBe('review');
    expect(res.dueAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('reps는 항상 1 증가', () => {
    const res = schedule(newCard(), 'good');
    expect(res.reps).toBe(1);
  });
});

describe('schedule() — learning card', () => {
  const learningCard: CardSnapshot = {
    state:          'learning',
    stability:      2.31,
    difficulty:     5,
    lapses:         0,
    reps:           1,
    lastReviewedAt: new Date(Date.now() - 86_400_000),
  };

  it('easy → review로 졸업 (short_term 비활성)', () => {
    const res = schedule(learningCard, 'easy', new Date(), { enable_short_term: false });
    expect(res.state).toBe('review');
  });

  it('easy는 good보다 dueAt 이후 (short_term 비활성)', () => {
    const now = new Date();
    const opts = { enable_short_term: false };
    const resGood = schedule(learningCard, 'good', now, opts);
    const resEasy = schedule(learningCard, 'easy', now, opts);
    expect(resEasy.dueAt.getTime()).toBeGreaterThanOrEqual(resGood.dueAt.getTime());
  });

  it('again → learning 유지, lapses 0 유지 (FSRS-6 learning은 lapses 미증가)', () => {
    const res = schedule(learningCard, 'again');
    expect(res.state).toBe('learning');
    expect(res.lapses).toBe(0);
  });
});

describe('schedule() — review card', () => {
  it('good → review 유지, stability 증가', () => {
    const card = reviewCard();
    const res = schedule(card, 'good');
    expect(res.state).toBe('review');
    expect(res.stability).toBeGreaterThan(card.stability);
  });

  it('easy → review 유지, hard보다 stability 높음', () => {
    const card = reviewCard();
    const easyRes = schedule(card, 'easy');
    const hardRes = schedule(card, 'hard');
    expect(easyRes.stability).toBeGreaterThan(hardRes.stability);
  });

  it('again → relearning, lapses++', () => {
    const card = reviewCard({ lapses: 0 });
    const res = schedule(card, 'again');
    expect(res.state).toBe('relearning');
    expect(res.lapses).toBe(1);
  });
});

describe('schedule() — relearning card', () => {
  const relearningCard: CardSnapshot = {
    state:          'relearning',
    stability:      1.5,
    difficulty:     7,
    lapses:         1,
    reps:           6,
    lastReviewedAt: new Date(Date.now() - 86_400_000),
  };

  it('good → review로 복귀', () => {
    const res = schedule(relearningCard, 'good');
    expect(res.state).toBe('review');
  });

  it('again → relearning 유지', () => {
    const res = schedule(relearningCard, 'again');
    expect(res.state).toBe('relearning');
  });
});

describe('schedule() — 경계 값', () => {
  it('stability는 최대 36500일 클램프', () => {
    const card = reviewCard({ stability: 36_000 });
    const res = schedule(card, 'easy');
    expect(res.stability).toBeLessThanOrEqual(36_500);
  });

  it('stability는 0보다 크다', () => {
    const card = reviewCard({ stability: 0.01 });
    const res = schedule(card, 'again');
    expect(res.stability).toBeGreaterThan(0);
  });

  it('difficulty는 [1, 10] 범위', () => {
    const card = reviewCard({ difficulty: 9.9 });
    const res = schedule(card, 'again');
    expect(res.difficulty).toBeLessThanOrEqual(10);
    expect(res.difficulty).toBeGreaterThanOrEqual(1);
  });

  it('again 연속 → 난이도 증가 방향', () => {
    let card = newCard();
    const before = card.difficulty;
    const r1 = schedule(card, 'again');
    card = toSnapshot(r1);
    const r2 = schedule(card, 'again');
    card = toSnapshot(r2);
    expect(card.difficulty).toBeGreaterThanOrEqual(before);
  });

  it('easy → dueAt이 now보다 이후 (fuzz 비활성)', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const res = schedule(newCard(), 'easy', now, { enable_fuzz: false });
    expect(res.dueAt.getTime()).toBeGreaterThan(now.getTime());
  });
});
