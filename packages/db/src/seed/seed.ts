/**
 * packages/db/src/seed/seed.ts
 *
 * 전체 시드 오케스트레이터
 *
 * 사용법:
 *   tsx src/seed/seed.ts --local   # D1 로컬 (wrangler dev)
 *   tsx src/seed/seed.ts --remote  # D1 클라우드 프로덕션
 *
 * 흐름:
 *   1. 파서 6종 호출 → SQL 문 배열 수집
 *   2. 1000행 단위로 .sql 파일 청크 분할 → /tmp/seed_*.sql
 *   3. 각 파일을 wrangler d1 execute 로 순차 실행
 *   4. 임시 파일 삭제
 *
 * INSERT OR IGNORE 사용 → 멱등성 보장 (재실행 안전)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONTENT_PATHS } from './constants.js';
import { parseVocab } from './parse-vocab.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseSentences } from './parse-sentences.js';
import { parseSysProg } from './parse-sysprog.js';
import { parseCurriculum } from './parse-curriculum.js';
import { chunk } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WRANGLER_CONFIG = path.resolve(__dirname, '../../../../apps/api/wrangler.toml');
const DB_NAME         = 'nihongo-n3-prod';
const CHUNK_SIZE      = 800; // 1 청크당 최대 SQL 문 수

// ─────────────────────────────────────────────
// 인수 파싱
// ─────────────────────────────────────────────
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isLocal  = args.includes('--local') || !isRemote;
const targetFlag = isRemote ? '--remote' : '--local';

console.log(`\n🌱  nihongo-n3 시드 시작 (${isRemote ? 'remote' : 'local'})\n`);

// ─────────────────────────────────────────────
// SQL 문 수집
// ─────────────────────────────────────────────
const statements: string[] = [];

const collect = (label: string, stmts: string[]) => {
  console.log(`  ✔ ${label}: ${stmts.length}개`);
  statements.push(...stmts);
};

// N5
collect('N5 어휘',    parseVocab   ({ sourceCode: '04', level: 'N5', filePath: CONTENT_PATHS.n5Vocab }));
collect('N5 문법',    parseGrammar ({ sourceCode: '05', level: 'N5', filePath: CONTENT_PATHS.n5Grammar }));
collect('N5 한자',    parseKanji   ({ sourceCode: '03', level: 'N5', filePath: CONTENT_PATHS.n5Kanji }));
// N4
collect('N4 어휘',    parseVocab   ({ sourceCode: '07', level: 'N4', filePath: CONTENT_PATHS.n4Vocab }));
collect('N4 문법',    parseGrammar ({ sourceCode: '08', level: 'N4', filePath: CONTENT_PATHS.n4Grammar }));
collect('N4 한자',    parseKanji   ({ sourceCode: '06', level: 'N4', filePath: CONTENT_PATHS.n4Kanji }));
// N3
collect('N3 어휘①',  parseVocab   ({ sourceCode: '10A', level: 'N3', filePath: CONTENT_PATHS.n3Vocab1 }));
collect('N3 어휘②',  parseVocab   ({ sourceCode: '10B', level: 'N3', filePath: CONTENT_PATHS.n3Vocab2 }));
collect('N3 문법',    parseGrammar ({ sourceCode: '11', level: 'N3', filePath: CONTENT_PATHS.n3Grammar }));
collect('N3 한자',    parseKanji   ({ sourceCode: '09', level: 'N3', filePath: CONTENT_PATHS.n3Kanji }));
// 공통
collect('예문',       parseSentences({ sourceCode: '12', filePath: CONTENT_PATHS.sentences }));
collect('직무 어휘',  parseSysProg  ({ sourceCode: 'A',  filePath: CONTENT_PATHS.sysprog }));
collect('커리큘럼',   parseCurriculum());

console.log(`\n  총 ${statements.length}개 SQL 문 생성\n`);

// ─────────────────────────────────────────────
// 청크 분할 → 임시 파일 생성
// ─────────────────────────────────────────────
const tmpDir   = path.join(__dirname, '../../../../.tmp-seed');
fs.mkdirSync(tmpDir, { recursive: true });

const chunks   = chunk(statements, CHUNK_SIZE);
const sqlFiles: string[] = [];

chunks.forEach((stmts, idx) => {
  const filePath = path.join(tmpDir, `seed_${String(idx).padStart(4, '0')}.sql`);
  fs.writeFileSync(filePath, stmts.join('\n\n') + '\n', 'utf-8');
  sqlFiles.push(filePath);
});

console.log(`  📦 ${sqlFiles.length}개 파일로 분할 (청크 크기: ${CHUNK_SIZE})\n`);

// ─────────────────────────────────────────────
// wrangler d1 execute 순차 실행
// ─────────────────────────────────────────────
let failed = false;

for (const [i, sqlFile] of sqlFiles.entries()) {
  const cmd = [
    'wrangler d1 execute',
    DB_NAME,
    targetFlag,
    `--file="${sqlFile}"`,
    `--config="${WRANGLER_CONFIG}"`,
    '--yes',
  ].join(' ');

  process.stdout.write(`  [${i + 1}/${sqlFiles.length}] 실행 중...`);
  try {
    execSync(cmd, { stdio: 'pipe' });
    process.stdout.write(' ✔\n');
  } catch (err) {
    process.stdout.write(' ✗\n');
    console.error(`\n❌ 오류 발생 (파일: ${path.basename(sqlFile)})`);
    console.error(err instanceof Error ? err.message : String(err));
    failed = true;
    break;
  }
}

// ─────────────────────────────────────────────
// 임시 파일 정리
// ─────────────────────────────────────────────
fs.rmSync(tmpDir, { recursive: true, force: true });

if (failed) {
  console.error('\n❌ 시드 실패. 위 오류를 확인하세요.\n');
  process.exit(1);
} else {
  console.log('\n✅ 시드 완료!\n');
}
