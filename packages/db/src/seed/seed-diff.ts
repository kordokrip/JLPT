/**
 * packages/db/src/seed/seed-diff.ts
 *
 * 변경분 전용 시드 스크립트 — --diff-only
 *
 * 사용법:
 *   tsx src/seed/seed-diff.ts --local  [--base=HEAD~1]
 *   tsx src/seed/seed-diff.ts --remote [--base=HEAD~1]
 *   tsx src/seed/seed-diff.ts --local  --files=docs/01_n5/04_vocab.md --dry-run
 *
 * 흐름:
 *   1. --files 지정 시 해당 파일 목록 사용, 아니면 git diff 사용
 *      (.git 부재 시 mtime fallback 사용)
 *   2. 각 파일을 SOURCE_FILE_MAP 으로 매핑 → sourceCode + table 특정
 *   3. 변경(M/A): DELETE 기존 행 + INSERT 재파싱 (멱등성)
 *      삭제(D):    DELETE 기존 행만 실행
 *   4. 변경 없으면 조기 종료 (skip)
 *
 * 멱등성 보장:
 *   - DELETE + INSERT 전략으로 중복 INSERT 없음
 *   - 재실행 시 동일 결과 (같은 source_code 범위만 교체)
 *   - deletion 감지: D 상태 파일 → DELETE만 실행
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONTENT_PATHS, REPO_ROOT } from './constants.js';
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
const CHUNK_SIZE      = 800;

// ─────────────────────────────────────────────
// 인수 파싱
// ─────────────────────────────────────────────
const args         = process.argv.slice(2);
const isRemote     = args.includes('--remote');
const isDryRun     = args.includes('--dry-run');
const targetFlag   = isRemote ? '--remote' : '--local';
const baseArg      = args.find(a => a.startsWith('--base='));
const filesArg     = args.find(a => a.startsWith('--files='));
const mtimeArg     = args.find(a => a.startsWith('--mtime-window-hours='));
const gitBase      = baseArg ? baseArg.slice('--base='.length) : 'HEAD~1';
const explicitFiles = filesArg
  ? filesArg.slice('--files='.length).split(',').map((f) => f.trim()).filter(Boolean)
  : [];
const mtimeWindowHours = mtimeArg
  ? Number.parseFloat(mtimeArg.slice('--mtime-window-hours='.length))
  : 24;
const mtimeWindowMs = Number.isFinite(mtimeWindowHours) && mtimeWindowHours > 0
  ? mtimeWindowHours * 60 * 60 * 1000
  : 24 * 60 * 60 * 1000;

console.log(
  `\n🔍  nihongo-n3 diff 시드 시작 ` +
  `(${isRemote ? 'remote' : 'local'}, base=${gitBase}, dryRun=${isDryRun})\n`,
);

// ─────────────────────────────────────────────
// SOURCE FILE MAP: 파일 경로 → (sourceCode, table, parser)
//
// 시드 대상 매핑은 12개 콘텐츠 소스로 제한합니다.
// 의도적으로 제외되는 docs 파일:
// - docs/04_supplement/02_pronunciation_kana.md:
//   정적 학습 문서이며 현재 D1 콘텐츠 테이블로 가져오지 않습니다.
// - docs/04_supplement/C_self_check_16weeks.md:
//   사용자별 자가진단 입력 폼의 템플릿이며 self_check 테이블에는
//   사용자 데이터만 저장합니다.
//
// 위 두 파일은 @nihongo-n3/content의 CONTENT_FILES에서 seeded: false로
// 명시되며, 현재 시드 파이프라인의 책임이 아닙니다.
// ─────────────────────────────────────────────
type ParserFn = () => string[];
type SourceEntry = {
  filePath: string;
  sourceCode: string;
  /**
   * D1 테이블명 — DELETE 대상
   * 'vocab' | 'grammar' | 'kanji' | 'sentences' | 'sysprog_terms' | 'curriculum_weeks'
   */
  table: string;
  /** null이면 파서 없음 (DELETE만) */
  parser: ParserFn | null;
};

const SOURCE_FILE_MAP: SourceEntry[] = [
  {
    filePath:   CONTENT_PATHS.n5Vocab,
    sourceCode: '04',
    table:      'vocab',
    parser:     () => parseVocab({ sourceCode: '04', level: 'N5', filePath: CONTENT_PATHS.n5Vocab }),
  },
  {
    filePath:   CONTENT_PATHS.n5Grammar,
    sourceCode: '05',
    table:      'grammar',
    parser:     () => parseGrammar({ sourceCode: '05', level: 'N5', filePath: CONTENT_PATHS.n5Grammar }),
  },
  {
    filePath:   CONTENT_PATHS.n5Kanji,
    sourceCode: '03',
    table:      'kanji',
    parser:     () => parseKanji({ sourceCode: '03', level: 'N5', filePath: CONTENT_PATHS.n5Kanji }),
  },
  {
    filePath:   CONTENT_PATHS.n4Vocab,
    sourceCode: '07',
    table:      'vocab',
    parser:     () => parseVocab({ sourceCode: '07', level: 'N4', filePath: CONTENT_PATHS.n4Vocab }),
  },
  {
    filePath:   CONTENT_PATHS.n4Grammar,
    sourceCode: '08',
    table:      'grammar',
    parser:     () => parseGrammar({ sourceCode: '08', level: 'N4', filePath: CONTENT_PATHS.n4Grammar }),
  },
  {
    filePath:   CONTENT_PATHS.n4Kanji,
    sourceCode: '06',
    table:      'kanji',
    parser:     () => parseKanji({ sourceCode: '06', level: 'N4', filePath: CONTENT_PATHS.n4Kanji }),
  },
  {
    filePath:   CONTENT_PATHS.n3Vocab1,
    sourceCode: '10A',
    table:      'vocab',
    parser:     () => parseVocab({ sourceCode: '10A', level: 'N3', filePath: CONTENT_PATHS.n3Vocab1 }),
  },
  {
    filePath:   CONTENT_PATHS.n3Vocab2,
    sourceCode: '10B',
    table:      'vocab',
    parser:     () => parseVocab({ sourceCode: '10B', level: 'N3', filePath: CONTENT_PATHS.n3Vocab2 }),
  },
  {
    filePath:   CONTENT_PATHS.n3Grammar,
    sourceCode: '11',
    table:      'grammar',
    parser:     () => parseGrammar({ sourceCode: '11', level: 'N3', filePath: CONTENT_PATHS.n3Grammar }),
  },
  {
    filePath:   CONTENT_PATHS.n3Kanji,
    sourceCode: '09',
    table:      'kanji',
    parser:     () => parseKanji({ sourceCode: '09', level: 'N3', filePath: CONTENT_PATHS.n3Kanji }),
  },
  {
    filePath:   CONTENT_PATHS.sentences,
    sourceCode: '12',
    table:      'sentences',
    parser:     () => parseSentences({ sourceCode: '12', filePath: CONTENT_PATHS.sentences }),
  },
  {
    filePath:   CONTENT_PATHS.sysprog,
    sourceCode: 'A',
    table:      'sysprog_terms',
    parser:     () => parseSysProg({ sourceCode: 'A', filePath: CONTENT_PATHS.sysprog }),
  },
];

// ─────────────────────────────────────────────
// git diff 파싱
// ─────────────────────────────────────────────
type DiffStatus = 'M' | 'A' | 'D' | 'R' | 'C';

interface DiffEntry {
  status: DiffStatus;
  filePath: string; // 절대 경로
}

function isGitAvailable(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf-8',
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function getExplicitFileDiff(files: string[]): DiffEntry[] {
  console.log(`[seed-diff] explicit file mode (${files.length} files)`);
  return files.map((file) => {
    const filePath = path.isAbsolute(file) ? file : path.join(REPO_ROOT, file);
    return {
      status: fs.existsSync(filePath) ? 'M' : 'D',
      filePath,
    };
  });
}

function getGitDiff(base: string): DiffEntry[] {
  let output: string;
  try {
    output = execSync(`git diff --name-status ${base}..HEAD`, {
      encoding: 'utf-8',
      cwd: REPO_ROOT,
    });
  } catch {
    console.warn(`⚠️  git diff 실패 (base=${base}). mtime fallback으로 전환합니다.`);
    return getMtimeDiff(mtimeWindowMs);
  }

  return output
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split('\t');
      const rawStatus = parts[0].charAt(0) as DiffStatus;
      // R100\told\tnew 형태 처리 (rename)
      const relPath = parts[parts.length - 1];
      return [{ status: rawStatus, filePath: path.join(REPO_ROOT, relPath) }];
    });
}

function getMtimeDiff(windowMs: number): DiffEntry[] {
  const now = Date.now();
  console.warn(`[seed-diff] git unavailable; mtime fallback 사용 (window=${Math.round(windowMs / 1000)}s)`);

  return SOURCE_FILE_MAP
    .filter((entry) => {
      if (!fs.existsSync(entry.filePath)) return false;
      const mtime = fs.statSync(entry.filePath).mtimeMs;
      return now - mtime <= windowMs;
    })
    .map((entry) => ({ status: 'M' as const, filePath: entry.filePath }));
}

function getDiffEntries(): DiffEntry[] {
  if (explicitFiles.length > 0) {
    return getExplicitFileDiff(explicitFiles);
  }

  if (isGitAvailable()) {
    console.log(`[seed-diff] git mode (base=${gitBase})`);
    return getGitDiff(gitBase);
  }

  return getMtimeDiff(mtimeWindowMs);
}

// ─────────────────────────────────────────────
// 매핑: diff entries → SourceEntry 목록
// ─────────────────────────────────────────────
interface WorkItem {
  entry:   SourceEntry;
  deleted: boolean; // true → DELETE only
}

function resolveWorkItems(diffs: DiffEntry[]): WorkItem[] {
  const seen = new Set<string>();
  const items: WorkItem[] = [];

  for (const diff of diffs) {
    const match = SOURCE_FILE_MAP.find(
      (s) => path.resolve(s.filePath) === path.resolve(diff.filePath),
    );
    if (!match) continue;
    if (seen.has(match.sourceCode)) continue;
    seen.add(match.sourceCode);

    items.push({ entry: match, deleted: diff.status === 'D' });
  }

  return items;
}

// ─────────────────────────────────────────────
// SQL 생성
// ─────────────────────────────────────────────
function buildStatements(items: WorkItem[]): string[] {
  const stmts: string[] = [];

  for (const { entry, deleted } of items) {
    const { table, sourceCode, parser } = entry;
    const deleteSQL = `DELETE FROM ${table} WHERE source_code = '${sourceCode}';`;

    if (deleted) {
      console.log(`  🗑  삭제 감지: ${table} source_code='${sourceCode}'`);
      stmts.push(deleteSQL);
      continue;
    }

    if (!parser) continue;

    console.log(`  ↻  변경 감지: ${table} source_code='${sourceCode}' → DELETE + INSERT`);
    stmts.push(deleteSQL);

    const insertStmts = parser();
    console.log(`     └─ ${insertStmts.length}개 INSERT 생성`);
    stmts.push(...insertStmts);
  }

  return stmts;
}

// ─────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────
const diffs    = getDiffEntries();
const workItems = resolveWorkItems(diffs);

if (workItems.length === 0) {
  console.log('ℹ️  콘텐츠 변경 없음. 스킵합니다.\n');
  process.exit(0);
}

const statements = buildStatements(workItems);
console.log(`\n  총 ${statements.length}개 SQL 문 생성\n`);

if (isDryRun) {
  console.log('🧪 dry-run 모드: wrangler 실행 없이 종료합니다.');
  process.exit(0);
}

// 청크 분할 → 임시 파일
const tmpDir = path.join(__dirname, '../../../../.tmp-seed-diff');
fs.mkdirSync(tmpDir, { recursive: true });

const chunks   = chunk(statements, CHUNK_SIZE);
const sqlFiles: string[] = [];

chunks.forEach((stmts, idx) => {
  const filePath = path.join(tmpDir, `diff_${String(idx).padStart(4, '0')}.sql`);
  fs.writeFileSync(filePath, stmts.join('\n\n') + '\n', 'utf-8');
  sqlFiles.push(filePath);
});

console.log(`  📦 ${sqlFiles.length}개 파일로 분할\n`);

// wrangler d1 execute 순차 실행
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
    console.error(err instanceof Error ? err.message : String(err));
    failed = true;
    break;
  }
}

fs.rmSync(tmpDir, { recursive: true, force: true });

if (failed) {
  console.error('\n❌ diff 시드 실패.\n');
  process.exit(1);
} else {
  console.log(`\n✅ diff 시드 완료 (${workItems.length}개 소스 처리됨)\n`);
}
