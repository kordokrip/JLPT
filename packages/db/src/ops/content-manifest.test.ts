import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildContentSeedPlan,
  hasCompleteProvenance,
  SEEDED_SOURCE_COUNT,
} from '../seed/content-manifest.js';
import { HOMOPHONE_PAIRS, validateHomophonePairs } from '../seed/homophone-pairs.js';

test('records complete provenance for every operating seed source', () => {
  const manifest = buildContentSeedPlan().manifest;

  assert.equal(manifest.entries.length, SEEDED_SOURCE_COUNT);
  assert.ok(manifest.entries.every((entry) => hasCompleteProvenance(entry.provenance)));
  assert.ok(manifest.entries.every((entry) => entry.sha256.length === 64));
  assert.ok(manifest.entries.every((entry) => entry.sourceVersion.startsWith('source-v3-')));
  assert.ok(manifest.entries.every((entry) => entry.parserVersion === manifest.parserVersion));
});

test('rejects malformed provenance URLs and review dates', () => {
  const provenance = buildContentSeedPlan().manifest.entries[0]?.provenance;
  assert.ok(provenance);

  assert.equal(hasCompleteProvenance({
    ...provenance,
    origin: { ...provenance.origin, url: 'not-a-url' },
  }), false);
  assert.equal(hasCompleteProvenance({
    ...provenance,
    reviewedAt: '2026-02-30',
  }), false);
});

test('rejects self-pairs and malformed review metadata', () => {
  const selfPairs = structuredClone(HOMOPHONE_PAIRS);
  const selfPair = selfPairs[0];
  assert.ok(selfPair);
  selfPair.wordB.ja = selfPair.wordA.ja;
  assert.throws(() => validateHomophonePairs(selfPairs), /two distinct words/);

  const invalidSourcePairs = structuredClone(HOMOPHONE_PAIRS);
  const invalidSource = invalidSourcePairs[0];
  assert.ok(invalidSource);
  invalidSource.accentSourceUrl = 'http://example.invalid';
  assert.throws(() => validateHomophonePairs(invalidSourcePairs), /HTTPS accent source/);
});

test('keeps content identity deterministic while recording each seed run separately', () => {
  const first = buildContentSeedPlan().manifest;
  const second = buildContentSeedPlan().manifest;

  assert.equal(first.contentVersion, second.contentVersion);
  assert.equal(first.manifestSha256, second.manifestSha256);
  assert.notEqual(first.seedRunId, second.seedRunId);
  assert.ok(first.derivedContent.homophonePairs.expectedRows >= 30);
  assert.equal(first.derivedContent.homophonePairs.sha256.length, 64);
});
