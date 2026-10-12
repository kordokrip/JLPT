// 강성호 2026-10-11: 신규 콘텐츠 테스트 모드가 승인 전 기존 경로를 삭제하거나 외부/재사용 DB를 초기화하지 못하는지 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./e2e-api-dev.sh', import.meta.url);
test('reviewed bootstrap rejects dangerous/reused/external targets before changing a sentinel', () => {
  const root = mkdtempSync(join(tmpdir(), 'reviewed-e2e-negative-'));
  const sentinel = join(root, 'keep.txt');
  writeFileSync(sentinel, 'preserve');
  for (const options of [
    { E2E_D1_PERSIST_TO: root },
    { E2E_SKIP_DB_BOOTSTRAP: '1' },
    { E2E_REUSE_EXISTING_SERVER: '1' },
    { E2E_BASE_URL: 'https://example.test' },
    { E2E_WRANGLER_CONFIG: '/not/a/test/config.toml' },
  ]) {
    const result = spawnSync('bash', [script.pathname], {
      env: { PATH: process.env.PATH, E2E_REVIEWED_COHORT: '/missing-evidence', ...options },
      encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refuses external\/reused persistence or non-test config/);
    assert.equal(readFileSync(sentinel, 'utf8'), 'preserve');
    assert.doesNotMatch(result.stdout, /applying canonical|seeding and verifying/);
  }
});
