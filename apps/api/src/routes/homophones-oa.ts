import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { homophonesQuerySchema } from '@nihongo-n3/shared';

import type { AppEnv } from '../types.js';

const sourceSchema = z.object({
  code: z.string(),
  file_path: z.string(),
  version: z.string(),
});

const wordSchema = z.object({
  id: z.number().int(),
  word: z.string(),
  reading: z.string(),
  meaning: z.string(),
  level: z.string(),
  source: sourceSchema,
});

const homophoneSchema = z.object({
  id: z.number().int(),
  level: z.string(),
  reading: z.string(),
  note_ko: z.string(),
  word_a: wordSchema,
  word_b: wordSchema,
  accent: z.object({
    source: z.string(),
    source_url: z.string().url(),
    word_a: z.string(),
    word_b: z.string(),
  }),
  examples: z.object({
    word_a: z.object({ ja: z.string(), ko: z.string() }),
    word_b: z.object({ ja: z.string(), ko: z.string() }),
  }),
  review: z.object({ reviewer: z.string(), reviewed_at: z.string() }),
});

const listResponseSchema = z
  .object({ data: z.array(homophoneSchema) })
  .openapi('HomophoneListResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

const listRoute = createRoute({
  method: 'get',
  path: '/homophones',
  tags: ['Homophones'],
  summary: '검수 완료 동음이의어 쌍 목록',
  description: '출처, 악센트, 예문, 검수 기록을 모두 가진 동음이의어 쌍만 반환합니다.',
  request: { query: homophonesQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: listResponseSchema } }, description: '동음이의어 목록' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

interface HomophoneRow {
  id: number;
  level: string;
  note_ko: string;
  accent_source: string;
  accent_source_url: string;
  accent_a: string;
  accent_b: string;
  example_a_ja: string;
  example_a_ko: string;
  example_b_ja: string;
  example_b_ko: string;
  reviewer: string;
  reviewed_at: string;
  word_a_id: number;
  word_a: string;
  word_a_reading: string;
  word_a_meaning: string;
  word_a_level: string;
  word_a_source_code: string;
  word_a_source_path: string;
  word_a_source_version: string;
  word_b_id: number;
  word_b: string;
  word_b_reading: string;
  word_b_meaning: string;
  word_b_level: string;
  word_b_source_code: string;
  word_b_source_path: string;
  word_b_source_version: string;
}

const homophonesOA = new OpenAPIHono<AppEnv>();

homophonesOA.openapi(listRoute, async (c) => {
  const { level, limit } = c.req.valid('query');
  const conditions = [
    "trim(COALESCE(hp.note_ko, '')) <> ''",
    "trim(hp.accent_source) <> ''",
    "trim(hp.accent_source_url) <> ''",
    "trim(hp.accent_a) <> ''",
    "trim(hp.accent_b) <> ''",
    "trim(hp.example_a_ja) <> ''",
    "trim(hp.example_a_ko) <> ''",
    "trim(hp.example_b_ja) <> ''",
    "trim(hp.example_b_ko) <> ''",
    "trim(hp.reviewer) <> ''",
    "trim(hp.reviewed_at) <> ''",
    'va.kana = vb.kana',
    'va.source_id = sa.id',
    'vb.source_id = sb.id',
  ];
  const bindings: unknown[] = [];

  if (level) {
    conditions.push('(hp.level = ? OR va.level = ? OR vb.level = ?)');
    bindings.push(level, level, level);
  }
  bindings.push(limit);

  const rows = await c.env.DB.prepare(
    `SELECT
       hp.id, hp.level, hp.note_ko,
       hp.accent_source, hp.accent_source_url, hp.accent_a, hp.accent_b,
       hp.example_a_ja, hp.example_a_ko, hp.example_b_ja, hp.example_b_ko,
       hp.reviewer, hp.reviewed_at,
       va.id AS word_a_id, va.ja AS word_a, va.kana AS word_a_reading,
       va.ko AS word_a_meaning, va.level AS word_a_level,
       sa.code AS word_a_source_code, sa.file_path AS word_a_source_path,
       sa.version AS word_a_source_version,
       vb.id AS word_b_id, vb.ja AS word_b, vb.kana AS word_b_reading,
       vb.ko AS word_b_meaning, vb.level AS word_b_level,
       sb.code AS word_b_source_code, sb.file_path AS word_b_source_path,
       sb.version AS word_b_source_version
     FROM homophone_pairs hp
     JOIN vocab va ON va.id = hp.word_a_id
     JOIN vocab vb ON vb.id = hp.word_b_id
     JOIN sources sa ON sa.code = hp.word_a_source_code
     JOIN sources sb ON sb.code = hp.word_b_source_code
     WHERE ${conditions.join(' AND ')}
     ORDER BY hp.level, hp.id
     LIMIT ?`,
  ).bind(...bindings).all<HomophoneRow>();

  return c.json({
    data: (rows.results ?? []).map((row) => ({
      id: row.id,
      level: row.level,
      reading: row.word_a_reading,
      note_ko: row.note_ko,
      word_a: {
        id: row.word_a_id,
        word: row.word_a,
        reading: row.word_a_reading,
        meaning: row.word_a_meaning,
        level: row.word_a_level,
        source: {
          code: row.word_a_source_code,
          file_path: row.word_a_source_path,
          version: row.word_a_source_version,
        },
      },
      word_b: {
        id: row.word_b_id,
        word: row.word_b,
        reading: row.word_b_reading,
        meaning: row.word_b_meaning,
        level: row.word_b_level,
        source: {
          code: row.word_b_source_code,
          file_path: row.word_b_source_path,
          version: row.word_b_source_version,
        },
      },
      accent: {
        source: row.accent_source,
        source_url: row.accent_source_url,
        word_a: row.accent_a,
        word_b: row.accent_b,
      },
      examples: {
        word_a: { ja: row.example_a_ja, ko: row.example_a_ko },
        word_b: { ja: row.example_b_ja, ko: row.example_b_ko },
      },
      review: { reviewer: row.reviewer, reviewed_at: row.reviewed_at },
    })),
  }, 200);
});

export { homophonesOA };
