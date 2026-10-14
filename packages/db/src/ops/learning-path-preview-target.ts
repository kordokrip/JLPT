// 강성호 2026-10-12: 정식 레슨 출판을 전용 Preview에만 연결한다. 운영·학습자 테이블은 대상에서 제외한다.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../seed/constants.js';
import { querySqlBatch, type D1TargetOptions } from '../seed/d1-cli.js';
import { esc } from '../seed/utils.js';

export const LEARNING_PREVIEW_DATABASE = 'nihongo-n3-topik-preview';
export const LEARNING_PREVIEW_TOKEN = 'learning-path-v7-2026-10-11';
const PREVIEW_ID = '5c8863e9-09ea-4180-adb5-e097f4b8de34';
export const LEARNING_CONTENT_TABLES = [
  'sources','categories','vocab','grammar','kanji','sentences','jlpt_practice_questions','content_source_assets',
  'topik_owner_authored_curriculum_units','topik_owner_authored_curriculum_items',
  'content_releases','content_release_sources','content_release_jobs','content_release_gate_evidence',
  'content_release_preview_candidates','content_release_quality_requirements','content_quality_audits',
  'content_release_quality_audit_links','learning_content_stable_refs','content_speech_bindings','content_audio_bindings',
  'learning_lessons','learning_lesson_entries','content_learning_links',
] as const;

export function requireLearningPreviewTarget(target: D1TargetOptions, write: boolean, token?: string) {
  const config = resolve(REPO_ROOT, 'apps/api/wrangler.toml');
  if (!target.remote || target.database !== LEARNING_PREVIEW_DATABASE || target.env !== 'topik-preview' ||
      target.persistTo || realpathSync(target.config) !== realpathSync(config)) throw new Error('Only the explicit dedicated remote learning Preview target is supported; Production/local aliases are prohibited');
  const block = readFileSync(config, 'utf8').split('[[env.topik-preview.d1_databases]]')[1]?.split(/\n\s*\[/u)[0];
  if (!block || !block.includes(`database_name = "${LEARNING_PREVIEW_DATABASE}"`) || !block.includes(`database_id = "${PREVIEW_ID}"`)) throw new Error('Preview binding identity changed; refuse queries/writes');
  if (write && token !== LEARNING_PREVIEW_TOKEN) throw new Error(`Preview write requires ALLOW_LEARNING_PATH_PREVIEW_CHANGE=${LEARNING_PREVIEW_TOKEN}`);
}

export type ContentSnapshot = Partial<Record<(typeof LEARNING_CONTENT_TABLES)[number], Record<string, unknown>[]>>;
/** Fixed read-only content allowlist. Auth, accounts, progress, sessions, answers and personal notes are never copied. */
export function readLearningPreviewSnapshot(target: D1TargetOptions) {
  requireLearningPreviewTarget(target, false);
  const result = querySqlBatch<Record<string, unknown>>(target, [
    "SELECT count(*) n FROM d1_migrations WHERE name='0031_learning_lessons.sql'",
    ...LEARNING_CONTENT_TABLES.map(table => `SELECT * FROM ${table}`),
    'PRAGMA foreign_key_check',
  ]);
  if (result[0]?.[0]?.n !== 1) throw new Error('Preview requires exactly one canonical 0031 migration before content operations');
  if (result.at(-1)!.length) throw new Error('Preview FK check failed before content operations');
  return Object.fromEntries(LEARNING_CONTENT_TABLES.map((table, index) => [table, result[index + 1]!])) as ContentSnapshot;
}

/** A new in-memory planning mirror, not a backup or actual learner database. */
export function learningContentMirror(snapshot: ContentSnapshot) {
  if (Object.keys(snapshot).some(table => !(LEARNING_CONTENT_TABLES as readonly string[]).includes(table))) throw new Error('Non-content table in mirror snapshot');
  const db = new DatabaseSync(':memory:');
  try {
    const dir = new URL('../../drizzle-v2/', import.meta.url);
    for (const name of readdirSync(dir).filter(name => /^00\d\d_.*\.sql$/u.test(name) && Number(name.slice(0,4)) <= 31).sort())
      db.exec(readFileSync(new URL(name, dir), 'utf8').replaceAll('--> statement-breakpoint', ''));
    // Frozen/public rows are restored only into this owned ephemeral mirror, with identical trigger DDL restored afterwards.
    const triggers = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all() as {name:string;sql:string}[];
    db.exec('PRAGMA foreign_keys=OFF; BEGIN');
    for (const trigger of triggers) db.exec(`DROP TRIGGER "${trigger.name.replaceAll('"','""')}"`);
    for (const table of LEARNING_CONTENT_TABLES) {
      db.exec(`DELETE FROM ${table}`);
      const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => String(row.name)));
      for (const row of snapshot[table] ?? []) {
        if (Object.keys(row).some(key => !columns.has(key))) throw new Error(`Target schema differs from canonical mirror: ${table}`);
        const keys = Object.keys(row);
        if (!keys.length) throw new Error('Empty content row');
        const values = keys.map(key => row[key] === null ? 'NULL' : typeof row[key] === 'number' ? String(row[key]) : esc(String(row[key])));
        db.exec(`INSERT INTO ${table} (${keys.map(key => `"${key}"`).join(',')}) VALUES (${values.join(',')})`);
      }
    }
    for (const trigger of triggers) db.exec(trigger.sql);
    db.exec('COMMIT; PRAGMA foreign_keys=ON');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
