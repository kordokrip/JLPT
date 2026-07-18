/**
 * 변경 콘텐츠 감지와 파서 검증 전용 명령.
 *
 * 부분 DELETE/INSERT는 한자 중복 소유권과 category FK 때문에 안전하지 않다.
 * 이 명령은 D1을 변경하지 않으며, 실제 반영은 fresh DB에서 manifest 검증을
 * 통과한 전체 seed와 승인된 blue/green 절차로만 수행한다.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { buildContentSeedPlan } from './content-manifest.js';
import { CONTENT_PATHS, REPO_ROOT } from './constants.js';

const args = process.argv.slice(2);
if (args.includes('--remote')) {
  throw new Error('diff seed의 remote 실행은 비활성화되었습니다. 승인된 blue/green 전체 seed를 사용하십시오.');
}

const base = valueArg('--base') ?? 'HEAD~1';
const explicit = (valueArg('--files') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const seededFiles = new Set(Object.values(CONTENT_PATHS).map((file) => normalize(file)));
const changed = explicit.length > 0 ? explicit.map(normalize) : detectGitChanges(base);
const relevant = changed.filter((file) => seededFiles.has(file));

if (relevant.length === 0) {
  console.log('[seed-diff] 시드 대상 콘텐츠 변경 없음');
  process.exit(0);
}

console.log('[seed-diff] 변경된 시드 소스');
for (const file of relevant) console.log(`- ${path.relative(REPO_ROOT, file)}`);

const plan = buildContentSeedPlan();
console.log(`[seed-diff] 전체 manifest 파서 검증 통과: ${plan.manifest.entries.length} sources, ${plan.statements.length} statements`);
console.log('[seed-diff] D1은 변경하지 않았습니다. pnpm -F @nihongo-n3/db verify:fresh 로 clean DB 관문을 실행하십시오.');

function valueArg(name: string): string | undefined {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function normalize(file: string): string {
  return path.resolve(REPO_ROOT, file);
}

function detectGitChanges(baseRef: string): string[] {
  try {
    const output = execFileSync('git', ['diff', '--name-only', `${baseRef}..HEAD`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output.split('\n').filter(Boolean).map(normalize);
  } catch {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    console.warn('[seed-diff] git 기준을 읽지 못해 최근 24시간 mtime으로 검사합니다');
    return [...seededFiles].filter((file) => fs.existsSync(file) && fs.statSync(file).mtimeMs >= since);
  }
}
