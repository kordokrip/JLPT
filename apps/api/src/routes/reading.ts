/**
 * apps/api/src/routes/reading.ts
 *
 * Phase 8-D: 독해 시스템 API
 *
 * GET  /reading               — 지문 목록 (level, genre 필터, cursor 페이징)
 * GET  /reading/:id           — 지문 상세 + 문제
 * POST /reading/:id/submit    — 답안 제출 → quiz_attempts (mode=reading_mc) 저장
 * POST /admin/reading/tag     — 어휘·문법 자동 태깅 (관리자)
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, notFound, badRequest, created } from '../lib/response.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { tagPassage } from '../lib/tagger.js';

const reading = new Hono<AppEnv>();

const PAGE_SIZE = 20;

// ──────────────────────────────────────────────────────────────
// GET /reading — 지문 목록
// ──────────────────────────────────────────────────────────────
reading.get('/reading', async (c) => {
  const { level, genre, cursor } = c.req.query();
  const db = c.env.DB;

  const conditions: string[] = [];
  const binds: (string | number)[] = [];

  if (level) { conditions.push('level = ?'); binds.push(level); }
  if (genre) { conditions.push('genre  = ?'); binds.push(genre); }

  let cursorId: number | null = null;
  if (cursor) {
    try { cursorId = Number(decodeCursor(cursor)); } catch { /* ignore */ }
  }
  if (cursorId) { conditions.push('id > ?'); binds.push(cursorId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  type PassageRow = {
    id: number; level: string; genre: string;
    title_ja: string; word_count: number; created_at: number;
  };

  const rows = await db
    .prepare(
      `SELECT id, level, genre, title_ja, word_count, created_at
       FROM reading_passages
       ${where}
       ORDER BY id ASC
       LIMIT ?`,
    )
    .bind(...binds, PAGE_SIZE + 1)
    .all<PassageRow>();

  const items = rows.results ?? [];
  const hasMore = items.length > PAGE_SIZE;
  const page = items.slice(0, PAGE_SIZE);

  return ok(c, {
    items: page,
    cursor: hasMore ? encodeCursor(page[page.length - 1]!.id) : null,
  });
});

// ──────────────────────────────────────────────────────────────
// GET /reading/:id — 지문 상세 + 문제
// ──────────────────────────────────────────────────────────────
reading.get('/reading/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return badRequest(c, '유효하지 않은 ID');

  const db = c.env.DB;

  type PassageFull = {
    id: number; level: string; genre: string;
    title_ja: string; body_ja: string; body_ko: string;
    word_count: number; vocab_ids: string | null;
    grammar_ids: string | null; audio_r2_key: string | null;
    source_attribution: string | null; created_at: number;
  };

  const passage = await db
    .prepare(`SELECT * FROM reading_passages WHERE id = ?`)
    .bind(id)
    .first<PassageFull>();

  if (!passage) return notFound(c, '지문을 찾을 수 없습니다');

  type QuestionRow = {
    id: number; question_ja: string; question_ko: string;
    choices_json: string; answer_index: number; explanation_ko: string | null;
  };

  const qRows = await db
    .prepare(`SELECT * FROM reading_questions WHERE passage_id = ? ORDER BY id`)
    .bind(id)
    .all<QuestionRow>();

  const questions = (qRows.results ?? []).map((q) => ({
    ...q,
    choices: JSON.parse(q.choices_json) as string[],
  }));

  return ok(c, {
    ...passage,
    vocab_ids:   passage.vocab_ids   ? JSON.parse(passage.vocab_ids)   : [],
    grammar_ids: passage.grammar_ids ? JSON.parse(passage.grammar_ids) : [],
    questions,
  });
});

// ──────────────────────────────────────────────────────────────
// POST /reading/:id/submit — 답안 제출 (cfAccessAuth 필요)
// ──────────────────────────────────────────────────────────────
reading.post('/reading/:id/submit', cfAccessAuth, async (c) => {
  const passageId = Number(c.req.param('id'));
  if (!Number.isInteger(passageId) || passageId < 1) return badRequest(c, '유효하지 않은 ID');

  const body = await c.req.json<{ answers: number[] }>().catch(() => null);
  if (!body?.answers || !Array.isArray(body.answers)) {
    return badRequest(c, 'answers 배열이 필요합니다');
  }

  const db     = c.env.DB;
  const userId = c.get('userId');

  type QRow = { id: number; answer_index: number };
  const qRows = await db
    .prepare(`SELECT id, answer_index FROM reading_questions WHERE passage_id = ? ORDER BY id`)
    .bind(passageId)
    .all<QRow>();

  const questions = qRows.results ?? [];
  if (questions.length === 0) return notFound(c, '문제가 없습니다');

  let correct = 0;
  const detail = questions.map((q, i) => {
    const isCorrect = body.answers[i] === q.answer_index;
    if (isCorrect) correct++;
    return { question_id: q.id, user_answer: body.answers[i], correct: isCorrect };
  });

  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const now   = new Date().toISOString();

  const detailJson  = JSON.stringify(detail);
  const result = await db
    .prepare(
      `INSERT INTO quiz_attempts
         (user_id, quiz_type, mode, total, correct, score,
          detail_json, started_at, finished_at, created_at, updated_at)
       VALUES (?, 'reading_mc', 'reading_mc', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(userId, total, correct, score, detailJson, now, now, now, now)
    .run();

  return created(c, {
    attempt_id:  (result.meta as { last_row_id?: number }).last_row_id ?? 0,
    score,
    correct,
    total,
    detail,
  });
});

// ──────────────────────────────────────────────────────────────
// POST /admin/reading/tag — 어휘·문법 자동 태깅
// ──────────────────────────────────────────────────────────────
reading.post('/admin/reading/tag', cfAccessAuth, async (c) => {
  const body = await c.req.json<{ passage_id?: number; all?: boolean }>().catch(() => null);
  if (!body) return badRequest(c, 'body 필요');

  const db = c.env.DB;

  if (body.passage_id) {
    type PRow = { id: number; body_ja: string };
    const passage = await db
      .prepare(`SELECT id, body_ja FROM reading_passages WHERE id = ?`)
      .bind(body.passage_id)
      .first<PRow>();
    if (!passage) return notFound(c, '지문 없음');

    const { vocabIds, grammarIds } = await tagPassage(db, passage.body_ja);
    await db
      .prepare(`UPDATE reading_passages SET vocab_ids = ?, grammar_ids = ? WHERE id = ?`)
      .bind(JSON.stringify(vocabIds), JSON.stringify(grammarIds), passage.id)
      .run();
    return ok(c, { passage_id: passage.id, vocab_count: vocabIds.length, grammar_count: grammarIds.length });
  }

  if (body.all) {
    type PRow = { id: number; body_ja: string };
    const passages = await db
      .prepare(`SELECT id, body_ja FROM reading_passages ORDER BY id`)
      .all<PRow>();
    let updated = 0;
    for (const p of passages.results ?? []) {
      const { vocabIds, grammarIds } = await tagPassage(db, p.body_ja);
      await db
        .prepare(`UPDATE reading_passages SET vocab_ids = ?, grammar_ids = ? WHERE id = ?`)
        .bind(JSON.stringify(vocabIds), JSON.stringify(grammarIds), p.id)
        .run();
      updated++;
    }
    return ok(c, { updated });
  }

  return badRequest(c, 'passage_id 또는 all:true 필요');
});

export { reading };
