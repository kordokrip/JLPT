/**
 * apps/web/src/lib/db.ts
 *
 * Dexie 4 IndexedDB 스키마.
 * 계층 구조:
 *   1. 콘텐츠 테이블 (서버 미러) — vocab, grammar, kanji, sentences, sysprog, curriculum
 *   2. 학습 데이터 테이블      — srs_cards, review_logs, daily_logs, quiz_attempts, self_check
 *   3. 동기화 큐              — sync_queue
 */
import Dexie, { type EntityTable } from 'dexie';

// ─────────────────────────────────────────────
// 콘텐츠 타입 (서버 API 응답 미러)
// ─────────────────────────────────────────────
export interface VocabItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  part_of_speech?: string;
  example_jp?: string;
  example_ko?: string;
  audio_path?: string;
  source_id?: number;
  category_id?: number;
}

export interface GrammarItem {
  id: number;
  pattern: string;
  meaning: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  structure?: string;
  notes?: string;
  example_jp?: string;
  example_ko?: string;
  source_id?: number;
}

export interface KanjiItem {
  id: number;
  character: string;
  reading_on?: string;
  reading_kun?: string;
  meaning: string;
  stroke_count?: number;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  audio_path?: string;
  source_id?: number;
}

export interface SentenceItem {
  id: number;
  item_type: string;
  item_id: number;
  jp: string;
  ko: string;
  audio_path?: string;
}

export interface SysprogItem {
  id: number;
  term: string;
  reading?: string;
  meaning: string;
  domain?: string;
  example_jp?: string;
}

export interface CurriculumItem {
  id: number;
  week: number;
  day: number;
  phase: string;
  title: string;
  description?: string;
  items?: string; // JSON array of {type, id}
}

// ─────────────────────────────────────────────
// 학습 데이터 타입
// ─────────────────────────────────────────────
export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating    = 'again' | 'hard' | 'good' | 'easy';
export type ItemType  = 'vocab' | 'grammar' | 'kanji' | 'sentence' | 'sysprog';

export interface SrsCard {
  id?: number;
  user_id: string;
  item_type: ItemType;
  item_id: number;
  state: CardState;
  stability: number;
  difficulty: number;
  lapses: number;
  reps: number;
  due_at: string;   // ISO 날짜
  created_at: string;
  updated_at: string;
}

export interface ReviewLog {
  id?: number;
  user_id: string;
  item_type: ItemType;
  item_id: number;
  rating: Rating;
  scheduled_days: number;
  elapsed_days: number;
  stability_before: number;
  difficulty_before: number;
  stability_after: number;
  difficulty_after: number;
  reviewed_at: string;
  synced: 0 | 1;
}

export interface DailyLog {
  id?: number;
  user_id: string;
  log_date: string;   // YYYY-MM-DD
  reviews_done: number;
  new_cards: number;
  study_minutes: number;
  synced: 0 | 1;
}

export interface QuizAttempt {
  id?: number;
  user_id: string;
  session_date: string;
  item_type: ItemType;
  item_id: number;
  correct: 0 | 1;
  answer_given?: string;
  synced: 0 | 1;
}

export interface SelfCheck {
  user_id: string;
  week: number;
  scores: string;   // JSON {grammar:80, vocab:70, ...}
  notes?: string;
  checked_at: string;
  synced: 0 | 1;
}

// ─────────────────────────────────────────────
// 동기화 큐
// ─────────────────────────────────────────────
export type SyncOpType =
  | 'review'
  | 'daily_log'
  | 'quiz'
  | 'self_check';

export type SyncStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface SyncQueueItem {
  id?: number;
  op_id: string;      // UUID — 서버 멱등성 키
  type: SyncOpType;
  payload: string;    // JSON
  occurred_at: string;
  status: SyncStatus;
  retries: number;
  last_error?: string;
}

// ─────────────────────────────────────────────
// Dexie DB 클래스
// ─────────────────────────────────────────────
class NihongoDb extends Dexie {
  // 콘텐츠
  vocab!:      EntityTable<VocabItem,      'id'>;
  grammar!:    EntityTable<GrammarItem,    'id'>;
  kanji!:      EntityTable<KanjiItem,      'id'>;
  sentences!:  EntityTable<SentenceItem,   'id'>;
  sysprog!:    EntityTable<SysprogItem,    'id'>;
  curriculum!: EntityTable<CurriculumItem, 'id'>;

  // 학습 데이터
  srs_cards!:     EntityTable<SrsCard,      'id'>;
  review_logs!:   EntityTable<ReviewLog,    'id'>;
  daily_logs!:    EntityTable<DailyLog,     'id'>;
  quiz_attempts!: EntityTable<QuizAttempt,  'id'>;
  self_check!:    EntityTable<SelfCheck,    never>;

  // 동기화 큐
  sync_queue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('nihongo-n3');
    this.version(1).stores({
      // ── 콘텐츠 ──────────────────────────────
      vocab:      '++id, level, source_id, category_id',
      grammar:    '++id, level, source_id',
      kanji:      '++id, level, source_id, character',
      sentences:  '++id, [item_type+item_id]',
      sysprog:    '++id, domain',
      curriculum: '++id, week, day',

      // ── 학습 데이터 ──────────────────────────
      srs_cards:     '++id, [user_id+item_type+item_id], user_id, due_at, state',
      review_logs:   '++id, [user_id+item_type+item_id], reviewed_at, synced',
      daily_logs:    '++id, [user_id+log_date], synced',
      quiz_attempts: '++id, [user_id+session_date], synced',
      self_check:    '[user_id+week], synced',

      // ── 동기화 큐 ────────────────────────────
      sync_queue: '++id, op_id, status, occurred_at',
    });
  }
}

export const db = new NihongoDb();

// ─────────────────────────────────────────────
// 유틸 — 로컬 userId (단일 사용자)
// ─────────────────────────────────────────────
export const LOCAL_USER = 'owner';

// ─────────────────────────────────────────────
// 유틸 — 오늘 날짜 문자열
// ─────────────────────────────────────────────
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
