import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWranglerArgs,
  validateReleaseSha,
} from '../deploy-worker-with-release.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';

test('requires an immutable lowercase 40-character release SHA', () => {
  assert.equal(validateReleaseSha(SHA), null);
  assert.match(validateReleaseSha('3485c6e'), /40-character/);
  assert.match(validateReleaseSha(undefined), /40-character/);
});

test('overrides the stale config release variable on every Worker deployment', () => {
  const args = buildWranglerArgs({ releaseSha: SHA, environment: 'topik-preview' });
  assert.ok(args.includes(`--var=RELEASE_SHA:${SHA}`));
  assert.ok(args.includes('--env=topik-preview'));
  assert.ok(args.includes(`--message=release ${SHA}`));
});

test('adds dry-run only when explicitly requested', () => {
  assert.equal(buildWranglerArgs({ releaseSha: SHA }).includes('--dry-run'), false);
  assert.equal(buildWranglerArgs({ releaseSha: SHA, dryRun: true }).includes('--dry-run'), true);
});
