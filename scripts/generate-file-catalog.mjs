#!/usr/bin/env node
// 강성호 · 2026-10-10: 수동 파일 지도의 누락을 막기 위해 현재 Git 관리 파일을 분류한다.
import { execFileSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const target = 'docs/00_overview/PROJECT_FILE_CATALOG.md';
const entries = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8',
}).split('\0').filter(Boolean))];
const files = [];
for (const entry of entries) {
  try { await access(path.join(root, entry)); files.push(entry); } catch { /* Pending deletions are not current files. */ }
}
if (!files.includes(target)) files.push(target);
files.sort();
const groups = new Map();
for (const file of files) {
  const group = classify(file);
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(file);
}
const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));
const output = [
  '# 프로젝트 전체 파일 지도', '',
  '`pnpm docs:catalog`로 생성합니다. Git 관리 대상과 새 파일 중 ignore되지 않은 현재 파일을 포함하며, 삭제 예정 파일·의존성·빌드·로컬 DB·비밀·증적 원문은 제외합니다.', '',
  `총 **${files.length}개**. 폴더 역할·보존 기준은 [프로젝트 인벤토리](PROJECT_INVENTORY.md)를 참조합니다.`, '',
  '| 분류 | 파일 수 |', '| --- | ---: |',
  ...ordered.map(([group, entries]) => `| ${group} | ${entries.length} |`), '',
  ...ordered.flatMap(([group, entries]) => [
    `## ${group}`, '',
    ...entries.map(file => `- [${file}](../../${file})`), '',
  ]),
].join('\n');
const destination = path.join(root, target);
if (process.argv.includes('--check')) {
  const current = await readFile(destination, 'utf8').catch(() => '');
  if (current !== output) {
    process.stderr.write('File catalog is stale. Run pnpm docs:catalog.\n');
    process.exitCode = 1;
  } else process.stdout.write(`File catalog verified: ${files.length} paths.\n`);
} else {
  await writeFile(destination, output);
  process.stdout.write(`File catalog generated: ${files.length} paths.\n`);
}

function classify(file) {
  if (file.startsWith('.codex/')) return 'Agent 운영 지침';
  if (file.startsWith('.github/')) return 'GitHub 비활성 설정';
  if (file.startsWith('docs/history/')) return '문서 이력';
  if (file.startsWith('docs/00_overview/')) return '운영 문서';
  if (/^docs\/0[1-7]_/.test(file)) return '학습 콘텐츠 원본';
  if (file.startsWith('docs/')) return '문서 진입점';
  if (file.startsWith('packages/db/drizzle-v2/')) return 'DB migration 및 snapshot';
  if (file.startsWith('packages/db/src/content/')) return '콘텐츠 증적 및 리뷰';
  if (file.startsWith('packages/db/src/seed/')) return 'DB seed 및 parser';
  if (file.startsWith('packages/db/src/ops/')) return 'DB 검증 및 운영';
  if (file.startsWith('packages/db/')) return 'DB schema 및 설정';
  if (file.startsWith('packages/shared/')) return '공통 API 및 학습 계약';
  if (file.startsWith('e2e/visual-regression.spec.ts-snapshots/')) return '브라우저 시각 기준';
  if (file.startsWith('e2e/')) return '브라우저 테스트 및 설정';
  if (file.startsWith('scripts/')) return '로컬 운영 스크립트 및 테스트';
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) || /\/(?:__tests__|__snapshots__)\//.test(file)) return '앱 회귀 테스트';
  if (file.startsWith('apps/api/src/routes/')) return 'API route';
  if (file.startsWith('apps/api/src/lib/')) return 'API 공통 서비스';
  if (file.startsWith('apps/api/')) return 'Worker 진입점 및 설정';
  if (file.startsWith('apps/web/src/pages/')) return '학습 화면';
  if (file.startsWith('apps/web/src/features/')) return '학습 기능';
  if (file.startsWith('apps/web/src/components/')) return 'UI 컴포넌트';
  if (file.startsWith('apps/web/src/')) return '웹 공통 상태·계약·음성';
  if (file.startsWith('apps/web/public/')) return '브랜드 및 PWA 자산';
  if (file.startsWith('apps/web/')) return '웹 진입점 및 설정';
  return '루트 실행 및 정책';
}
