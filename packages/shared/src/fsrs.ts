/**
 * packages/shared/src/fsrs.ts
 *
 * ts-fsrs v5 wrapper — monorepo 전체에서 사용하는 단순화된 FSRS-6 API.
 */
import {
  fsrs as createFsrs,
  generatorParameters,
  createEmptyCard,
  Rating as TsRating,
  State   as TsState,
  default_w,
} from 'ts-fsrs';
import type { Card as TsCard, FSRSParameters, Grade } from 'ts-fsrs';

// ─── 공개 타입 ──────────────────────────────────────────────────────────────
export type Rating    = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface CardSnapshot {
  state:          CardState;
  stability:      number;
  difficulty:     number;
  lapses:         number;
  reps:           number;
  lastReviewedAt: Date | null;
}

export interface ScheduleResult {
  state:      CardState;
  stability:  number;
  difficulty: number;
  lapses:     number;
  reps:       number;
  dueAt:      Date;
}

export interface FsrsOptions {
  request_retention?: number;
  maximum_interval?:  number;
  enable_fuzz?:       boolean;
  enable_short_term?: boolean;
}

export interface IntervalPreview {
  rating:   Rating;
  interval: number; // days
  due:      Date;
}

// ─── 기본 가중치 (FSRS-6, 21 parameters) ───────────────────────────────────
export const FSRS6_DEFAULT_W: readonly number[] = default_w;

// ─── 내부 헬퍼 ─────────────────────────────────────────────────────────────
const RATING_MAP: Record<Rating, Grade> = {
  again: TsRating.Again,
  hard:  TsRating.Hard,
  good:  TsRating.Good,
  easy:  TsRating.Easy,
};

function stateToTs(s: CardState): TsState {
  switch (s) {
    case 'new':        return TsState.New;
    case 'learning':   return TsState.Learning;
    case 'review':     return TsState.Review;
    case 'relearning': return TsState.Relearning;
  }
}

function stateFromTs(s: TsState): CardState {
  switch (s) {
    case TsState.New:        return 'new';
    case TsState.Learning:   return 'learning';
    case TsState.Review:     return 'review';
    case TsState.Relearning: return 'relearning';
  }
}

function snapshotToCard(snapshot: CardSnapshot, now: Date): TsCard {
  return {
    due:            now,
    stability:      snapshot.stability,
    difficulty:     snapshot.difficulty,
    elapsed_days:   0,
    scheduled_days: 0,
    learning_steps: 0,
    reps:           snapshot.reps,
    lapses:         snapshot.lapses,
    state:          stateToTs(snapshot.state),
    ...(snapshot.lastReviewedAt ? { last_review: snapshot.lastReviewedAt } : {}),
  };
}

function makeParams(options?: FsrsOptions): FSRSParameters {
  return generatorParameters({
    ...(options?.request_retention !== undefined
      ? { request_retention: options.request_retention } : {}),
    ...(options?.maximum_interval  !== undefined
      ? { maximum_interval:  options.maximum_interval  } : {}),
    ...(options?.enable_fuzz       !== undefined
      ? { enable_fuzz:       options.enable_fuzz        } : {}),
    ...(options?.enable_short_term !== undefined
      ? { enable_short_term: options.enable_short_term  } : {}),
  });
}

// ─── 공개 API ───────────────────────────────────────────────────────────────

/**
 * 카드 복습을 스케줄하고 다음 상태를 반환한다.
 */
export function schedule(
  snapshot: CardSnapshot,
  rating:   Rating,
  now:      Date = new Date(),
  options?: FsrsOptions,
): ScheduleResult {
  const scheduler = createFsrs(makeParams(options));
  const card      = snapshotToCard(snapshot, now);
  const result    = scheduler.repeat(card, now);
  const next      = result[RATING_MAP[rating]].card;
  return {
    state:      stateFromTs(next.state),
    stability:  next.stability,
    difficulty: next.difficulty,
    lapses:     next.lapses,
    reps:       next.reps,
    dueAt:      next.due,
  };
}

/**
 * 모든 레이팅에 대한 예상 간격을 미리 계산한다.
 */
export function previewIntervals(
  snapshot: CardSnapshot,
  now:      Date = new Date(),
  options?: FsrsOptions,
): IntervalPreview[] {
  const scheduler = createFsrs(makeParams(options));
  const card      = snapshotToCard(snapshot, now);
  const result    = scheduler.repeat(card, now);
  const ratings: Rating[] = ['again', 'hard', 'good', 'easy'];
  return ratings.map((r) => {
    const next     = result[RATING_MAP[r]].card;
    const interval = Math.max(
      0,
      Math.round((next.due.getTime() - now.getTime()) / 86_400_000),
    );
    return { rating: r, interval, due: next.due };
  });
}

/**
 * 새 카드 스냅샷을 생성한다.
 */
export function createNewCard(): CardSnapshot {
  const empty = createEmptyCard(new Date());
  return {
    state:          stateFromTs(empty.state),
    stability:      empty.stability,
    difficulty:     empty.difficulty,
    lapses:         empty.lapses,
    reps:           empty.reps,
    lastReviewedAt: null,
  };
}

/**
 * dueAt(ISO 문자열)이 now 이전이면 true.
 */
export function isDue(dueAt: string, now: Date = new Date()): boolean {
  return new Date(dueAt) <= now;
}

/**
 * FsrsOptions을 캡처해서 반복 사용할 수 있는 스케줄러 팩토리.
 */
export function createScheduler(options?: FsrsOptions) {
  return {
    schedule: (s: CardSnapshot, r: Rating, now = new Date()) =>
      schedule(s, r, now, options),
    previewIntervals: (s: CardSnapshot, now = new Date()) =>
      previewIntervals(s, now, options),
  };
}
