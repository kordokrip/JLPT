// 강성호 2026-10-13: 통합 출판 대상을 명시적으로 고정한다. 기존 Preview-only CLI의 제한은 변경하지 않는다.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../seed/constants.js';
import { querySqlBatch, type D1TargetOptions } from '../seed/d1-cli.js';
import { LEARNING_CONTENT_TABLES, type ContentSnapshot } from './learning-path-preview-target.js';

export type CohortEnvironment = 'preview' | 'rollback-drill' | 'production';
export type CohortRemoteTarget = D1TargetOptions & {
  scope: CohortEnvironment; worker: string; pages: string; releaseSha: string;
};
const PRODUCTION_DB_ID = '0a22d92a-4af5-486f-8934-84eb1890835c';
const PREVIEW_DB_ID = '5c8863e9-09ea-4180-adb5-e097f4b8de34';
export const COHORT_CHANGE_TOKEN = 'learning-cohort-600-2026-10-13';

export function validateCohortIdentity(target: CohortRemoteTarget, binding: {database:string; id:string; worker:string}): void {
  if (!target.remote || target.persistTo || !/^[a-f0-9]{40}$/.test(target.releaseSha)) throw new Error('Explicit remote target and immutable candidate SHA required');
  if (binding.database !== target.database || binding.worker !== target.worker) throw new Error('Exact database/Worker identity mismatch');
  if (target.scope === 'production') {
    if (target.env || target.database !== 'nihongo-n3-prod-v2' || binding.id !== PRODUCTION_DB_ID || target.worker !== 'nihongo-n3-api' || target.pages !== 'https://nihongo-n3.pages.dev') throw new Error('Production target mismatch');
  } else if (target.scope === 'preview') {
    if (target.env !== 'topik-preview' || target.database !== 'nihongo-n3-topik-preview' || binding.id !== PREVIEW_DB_ID || target.worker !== 'nihongo-n3-api-topik-preview' || !/^https:\/\/[a-f0-9]{8}\.nihongo-n3\.pages\.dev$/.test(target.pages)) throw new Error('Preview target mismatch');
  } else if (target.scope === 'rollback-drill') {
    if (target.env || target.database !== 'nihongo-n3-learning-rollback-20261013' || target.worker !== 'nihongo-n3-learning-rollback-20261013' || !/^[a-f0-9-]{36}$/.test(binding.id) || [PRODUCTION_DB_ID,PREVIEW_DB_ID].includes(binding.id) || !/^https:\/\/[a-f0-9]{8}\.nihongo-n3-learning-rollback\.pages\.dev$/.test(target.pages)) throw new Error('Isolated rollback target mismatch');
  } else throw new Error('Unsupported target scope');
}

export function requireCohortRemoteTarget(target: CohortRemoteTarget, write: boolean, token?: string): void {
  const config = resolve(REPO_ROOT, target.scope === 'rollback-drill' ? 'apps/api/wrangler.learning-rollback.json' : 'apps/api/wrangler.toml');
  if (realpathSync(target.config) !== realpathSync(config)) throw new Error('Unsupported configuration path');
  const text = readFileSync(config,'utf8');
  let binding: {database:string; id:string; worker:string};
  if (target.scope === 'rollback-drill') {
    const parsed = JSON.parse(text);
    if (parsed.d1_databases?.length !== 1 || parsed.queues || parsed.workflows || parsed.r2_buckets || parsed.vars?.GOOGLE_CLIENT_SECRET || parsed.vars?.GOOGLE_CLIENT_ID) throw new Error('Drill config must not bind shared storage/background writers/OAuth credentials');
    binding = {database:parsed.d1_databases[0].database_name, id:parsed.d1_databases[0].database_id, worker:parsed.name};
  } else {
    const section = target.scope === 'production' ? text.split('[env.')[0]! : text.split('[env.topik-preview]')[1]!;
    const block = section?.split(target.scope === 'production' ? '[[d1_databases]]' : '[[env.topik-preview.d1_databases]]')[1]?.split(/\n\s*\[/u)[0];
    const match = (source:string|undefined,key:string) => source?.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`,'m'))?.[1] ?? '';
    binding = {database:match(block,'database_name'),id:match(block,'database_id'),worker:match(section,'name')};
  }
  validateCohortIdentity(target,binding);
  if (write) {
    if (token !== `${COHORT_CHANGE_TOKEN}:${target.scope}:${target.releaseSha}`) throw new Error('Exact cohort/scope/SHA change token required');
    const git = (args:string[]) => execFileSync('git',args,{cwd:REPO_ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    if (git(['rev-parse','HEAD']) !== target.releaseSha || git(['status','--porcelain=v1','--untracked-files=all'])) throw new Error('Writes require the exact clean candidate worktree');
  }
}

/** Content-only planning data. No accounts, sessions, answers, FSRS, progress or personal notes are exported. */
export function readLearningCohortSnapshot(target: CohortRemoteTarget): ContentSnapshot {
  requireCohortRemoteTarget(target,false);
  const results = querySqlBatch<Record<string,unknown>>(target,[
    "SELECT count(*) n FROM d1_migrations WHERE name='0031_learning_lessons.sql'",
    ...LEARNING_CONTENT_TABLES.map(table=>`SELECT * FROM ${table}`), 'PRAGMA foreign_key_check',
  ]);
  if (results[0]?.[0]?.n !== 1 || results.at(-1)?.length) throw new Error('Canonical 0031 ledger and FK0 required');
  return Object.fromEntries(LEARNING_CONTENT_TABLES.map((table,index)=>[table,results[index+1]!])) as ContentSnapshot;
}
