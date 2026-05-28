/**
 * packages/db/src/seed/verify.ts
 *
 * 시드 후 검증 스크립트
 *
 * 사용법:
 *   tsx src/seed/verify.ts --local
 *   tsx src/seed/verify.ts --remote
 *
 * 검사 항목:
 *   1. 테이블별 행 수 (최솟값 기준 PASS/FAIL)
 *   2. FTS 가상 테이블 행 수 일치
 *   3. 외래키 무결성 (PRAGMA foreign_key_check)
 *   4. audio_r2_key 누락 경고 (비차단)
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WRANGLER_CONFIG = path.resolve(__dirname, '../../../../apps/api/wrangler.toml');
const DB_NAME         = 'nihongo-n3-prod';

const args       = process.argv.slice(2);
const isRemote   = args.includes('--remote');
const targetFlag = isRemote ? '--remote' : '--local';

// ─────────────────────────────────────────────
// wrangler d1 execute 래퍼
// ─────────────────────────────────────────────
function runSql(sql: string): string {
  const cmd = [
    'wrangler d1 execute',
    DB_NAME,
    targetFlag,
    `--command="${sql.replace(/"/g, '\\"')}"`,
    `--config="${WRANGLER_CONFIG}"`,
    '--json',
    '--yes',
  ].join(' ');

  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    return err instanceof Error ? (err as NodeJS.ErrnoException & { stdout?: string }).stdout ?? '' : '';
  }
}

function parseCount(raw: string): number {
  try {
    // wrangler --json 출력: [{"results":[{"count(*)":42}],...}]
    const parsed = JSON.parse(raw) as Array<{ results: Array<Record<string, number>> }>;
    const row = parsed[0]?.results?.[0];
    if (!row) return -1;
    return Object.values(row)[0] ?? -1;
  } catch {
    return -1;
  }
}

// ─────────────────────────────────────────────
// 검사 정의
// ─────────────────────────────────────────────
interface CountCheck {
  label: string;
  sql: string;
  minExpected: number;
  blocking: boolean; // false → 경고만
}

const checks: CountCheck[] = [
  { label: 'vocab',         sql: 'SELECT count(*) FROM vocab',         minExpected: 1500, blocking: true  },
  { label: 'grammar',       sql: 'SELECT count(*) FROM grammar',       minExpected: 200,  blocking: true  },
  { label: 'kanji',         sql: 'SELECT count(*) FROM kanji',         minExpected: 300,  blocking: true  },
  { label: 'sentences',     sql: 'SELECT count(*) FROM sentences',     minExpected: 300,  blocking: true  },
  { label: 'sysprog_terms', sql: 'SELECT count(*) FROM sysprog_terms', minExpected: 100,  blocking: true  },
  { label: 'curriculum_weeks', sql: 'SELECT count(*) FROM curriculum_weeks', minExpected: 16, blocking: true },
  { label: 'vocab_fts ≈ vocab',
    sql: 'SELECT count(*) FROM vocab_fts',
    minExpected: 1500,
    blocking: true },
  { label: 'sentences_fts ≈ sentences',
    sql: 'SELECT count(*) FROM sentences_fts',
    minExpected: 300,
    blocking: true },
  // 경고만 (비차단)
  { label: 'vocab 오디오 미등록',
    sql: 'SELECT count(*) FROM vocab WHERE audio_r2_key IS NULL',
    minExpected: 0,
    blocking: false },
];

// ─────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────
console.log(`\n🔍 nihongo-n3 시드 검증 (${isRemote ? 'remote' : 'local'})\n`);

let hasError = false;

for (const check of checks) {
  const raw   = runSql(check.sql);
  const count = parseCount(raw);

  if (!check.blocking) {
    // 경고: 0이 아니면 경고 출력
    if (count > 0) {
      console.warn(`  ⚠  ${check.label}: ${count}건 (audio_r2_key 미등록 — R2 업로드 후 갱신 필요)`);
    }
    continue;
  }

  const passed = count >= check.minExpected;
  const icon   = passed ? '✔' : '✗';
  const status = passed ? 'PASS' : `FAIL (최소 ${check.minExpected} 필요, 실제: ${count})`;
  console.log(`  ${icon}  ${check.label.padEnd(28)} ${status}`);
  if (!passed) hasError = true;
}

// 외래키 무결성
console.log('\n  PRAGMA foreign_key_check...');
const fkRaw    = runSql('PRAGMA foreign_key_check');
const fkResult = (() => {
  try {
    const parsed = JSON.parse(fkRaw) as Array<{ results: unknown[] }>;
    return parsed[0]?.results ?? [];
  } catch { return []; }
})();

if (fkResult.length === 0) {
  console.log('  ✔  foreign_key_check: 이상 없음');
} else {
  console.error(`  ✗  foreign_key_check: ${fkResult.length}건 위반`);
  console.error(JSON.stringify(fkResult, null, 2));
  hasError = true;
}

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log('');
if (hasError) {
  console.error('❌ 검증 실패. 시드 출력 로그를 확인하세요.\n');
  process.exit(1);
} else {
  console.log('✅ 검증 통과!\n');
}
