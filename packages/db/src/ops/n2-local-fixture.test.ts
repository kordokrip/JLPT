import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildN2LocalFixturePlan,
  N2_LOCAL_FIXTURE_PATH,
  N2_LOCAL_FIXTURE_SOURCE_ASSET_ID,
} from '../seed/n2-local-fixture.js';
import { REPO_ROOT } from '../seed/constants.js';

test('N2 local fixture has self-authored provenance, stable IDs, and explicit pending R2 audio bindings', () => {
  const plan = buildN2LocalFixturePlan();
  assert.equal(plan.manifest.counts.vocab, 3);
  assert.equal(plan.manifest.counts.grammar, 1);
  assert.equal(plan.manifest.counts.kanji, 1);
  assert.equal(plan.manifest.counts.sentences, 1);
  assert.equal(plan.manifest.counts.reading, 1);
  assert.equal(plan.manifest.counts.audioBindings, 6);
  assert.equal(plan.manifest.counts.prerequisites, 1);
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);
  assert.ok(fs.readFileSync(N2_LOCAL_FIXTURE_PATH, 'utf8').includes('공식 JLPT 문항'));

  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N2_LOCAL_FIXTURE_SOURCE_ASSET_ID));
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_audio_bindings/);
  assert.match(sql, /learning_content_level_references/);
  assert.match(sql, /curriculum-reference:jlpt:n2:kanji:対/);
  assert.match(sql, /'preparing', NULL/);
  assert.doesNotMatch(sql, /INSERT INTO `kanji`[^;]*['"]対['"]/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|author_reviewer|second_reviewer/i);
});

test('additive migration keeps TOPIK owner curriculum separate from review-gated practice data', () => {
  const migration = fs.readFileSync(
    path.join(REPO_ROOT, 'packages/db/drizzle-v2/0017_content_source_audio_and_owner_curriculum.sql'),
    'utf8',
  );
  assert.match(migration, /CREATE TABLE `content_source_assets`/);
  assert.match(migration, /CREATE TABLE `content_audio_bindings`/);
  assert.match(migration, /CREATE TABLE `topik_owner_authored_curriculum_items`/);
  assert.match(migration, /target_grade` BETWEEN 1 AND 6/);
  assert.match(migration, /content_source_assets_immutable_update/);
  assert.match(migration, /content_audio_bindings_match_stable_ref/);
  assert.doesNotMatch(migration, /ALTER TABLE `topik_practice_questions`|author_reviewer|second_reviewer/);
});

test('N2 fixture keeps the existing N3 対 canonical row and models it as a prerequisite', () => {
  const n3KanjiSource = fs.readFileSync(
    path.join(REPO_ROOT, 'docs/03_n3/09_kanji.md'),
    'utf8',
  );
  const migration = fs.readFileSync(
    path.join(REPO_ROOT, 'packages/db/drizzle-v2/0018_preserve_existing_jlpt_levels.sql'),
    'utf8',
  );
  assert.match(migration, /learning_content_level_references/);
  assert.match(migration, /kanji_preserve_existing_n5_n3_representative_level/);
  assert.match(migration, /'N3'/);
  assert.match(migration, /cannot be relabeled/);
  assert.match(n3KanjiSource, /^\|\s*対\s*\|/m);
});
