import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWranglerArgs,
  validateReleaseSha,
  validateMaintenanceMode,
  verifyDeploymentHealth,
  parseDeploymentArgs,
} from '../deploy-worker-with-release.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';

test('requires an immutable lowercase 40-character release SHA', () => {
  assert.equal(validateReleaseSha(SHA), null);
  assert.match(validateReleaseSha('3485c6e'), /40-character/);
  assert.match(validateReleaseSha(undefined), /40-character/);
});

test('overrides the stale config release variable on every Worker deployment', () => {
  const args = buildWranglerArgs({ releaseSha: SHA, environment: 'topik-preview', maintenanceMode: 'off' });
  assert.ok(args.includes(`--var=RELEASE_SHA:${SHA}`));
  assert.ok(args.includes('--env=topik-preview'));
  assert.ok(args.includes(`--message=release ${SHA}`));
});

test('adds dry-run only when explicitly requested', () => {
  assert.equal(buildWranglerArgs({ releaseSha: SHA, maintenanceMode: 'off' }).includes('--dry-run'), false);
  assert.equal(buildWranglerArgs({ releaseSha: SHA, maintenanceMode: 'off', dryRun: true }).includes('--dry-run'), true);
});

test('requires an explicit maintenance mode instead of silently using config off', () => {
  assert.match(validateMaintenanceMode(undefined), /explicit/);
  assert.match(validateMaintenanceMode('false'), /explicit/);
  assert.equal(validateMaintenanceMode('read-only'), null);
  assert.equal(validateMaintenanceMode('off'), null);
  assert.throws(() => buildWranglerArgs({ releaseSha: SHA }), /explicit/);
  assert.ok(buildWranglerArgs({ releaseSha: SHA, maintenanceMode: 'read-only' }).includes('--var=MAINTENANCE_MODE:read-only'));
});

test('never silently turns a malformed Preview option into a Production deployment', () => {
  const common = [`--release-sha=${SHA}`, '--maintenance-mode=read-only'];
  for (const bad of [[], ['--env','topik-preview'], ['--env=constructor'], ['--environment=topik-preview'], ['--env=production','--env=topik-preview'], ['--env=topik-preview','--dry-run','--dry-run']])
    assert.throws(() => parseDeploymentArgs([...common,...bad]), /Explicit|prohibited/);
  assert.equal(parseDeploymentArgs([...common,'--env=topik-preview']).environment, 'topik-preview');
  assert.equal(parseDeploymentArgs([...common,'--env=production']).environment, undefined);
});

test('post-deployment health must match both source and maintenance mode', async () => {
  const body = { status: 'ok', release: SHA, maintenanceMode: 'read-only' };
  const response = (value, status = 200) => async () => new Response(JSON.stringify(value), {status});
  const options = { releaseSha: SHA, maintenanceMode: 'read-only', attempts: 1 };
  await verifyDeploymentHealth('https://example.test/health', options, response(body));
  await assert.rejects(verifyDeploymentHealth('https://example.test/health', options, response({...body, maintenanceMode:'off'})), /health/);
  await assert.rejects(verifyDeploymentHealth('https://example.test/health', options, response({...body, release:'old'})), /health/);
  await assert.rejects(verifyDeploymentHealth('https://example.test/health', options, response(body,503)), /health/);
});
