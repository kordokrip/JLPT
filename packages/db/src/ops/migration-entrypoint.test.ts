import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test('content release migrations use the drizzle-v2 entrypoint only', () => {
  const workerConfig = fs.readFileSync(path.join(root, 'apps/api/wrangler.toml'), 'utf8');
  const migrationDirs = [...workerConfig.matchAll(/^migrations_dir\s*=\s*"([^"]+)"$/gmu)]
    .map((match) => match[1]);

  assert.ok(migrationDirs.length > 0);
  assert.ok(migrationDirs.every((directory) => directory === '../../packages/db/drizzle-v2'));
  assert.ok(fs.existsSync(path.join(root, 'packages/db/drizzle-v2/0012_content_release_contract.sql')));
  assert.ok(fs.existsSync(path.join(root, 'packages/db/drizzle-v2/0013_content_release_control_plane.sql')));
  assert.ok(fs.existsSync(path.join(root, 'packages/db/drizzle-v2/0014_content_release_review_signoffs.sql')));
  assert.ok(fs.existsSync(path.join(root, 'packages/db/drizzle-v2/0015_ai_learning_assistance_foundation.sql')));
  assert.equal(fs.existsSync(path.join(root, 'packages/db/drizzle/0012_content_release_contract.sql')), false);
  assert.equal(fs.existsSync(path.join(root, 'packages/db/drizzle/0013_content_release_control_plane.sql')), false);
  assert.equal(fs.existsSync(path.join(root, 'packages/db/drizzle/0014_content_release_review_signoffs.sql')), false);
  assert.equal(fs.existsSync(path.join(root, 'packages/db/drizzle/0015_ai_learning_assistance_foundation.sql')), false);
});
