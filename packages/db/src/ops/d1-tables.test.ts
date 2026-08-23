import assert from 'node:assert/strict';
import test from 'node:test';

import { D1_TRANSFER_TABLES, EXCLUDED_TRANSIENT_TABLES } from './d1-tables.js';

test('D1 backup allowlist covers release, practice, owner, activity, speech, and FSRS tables', () => {
  const names = D1_TRANSFER_TABLES.map((table) => table.name);
  assert.equal(names.length, 65);
  assert.equal(new Set(names).size, names.length);
  for (const required of [
    'content_releases',
    'content_quality_audits',
    'content_release_quality_audit_links',
    'jlpt_practice_questions',
    'topik_owner_authored_curriculum_items',
    'content_speech_bindings',
    'learning_activity_events',
    'topik_owner_srs_cards',
    'topik_owner_review_logs',
  ]) assert.ok(names.includes(required), required);
  assert.deepEqual(EXCLUDED_TRANSIENT_TABLES, ['_cf_KV', 'd1_migrations', 'oauth_states', 'oauth_login_tokens']);
});

test('D1 restore order keeps known FK parents before their children', () => {
  const position = new Map(D1_TRANSFER_TABLES.map((table, index) => [table.name, index]));
  for (const [parent, child] of [
    ['content_releases', 'content_release_sources'],
    ['content_quality_audits', 'content_release_quality_audit_links'],
    ['topik_owner_authored_curriculum_units', 'topik_owner_authored_curriculum_items'],
    ['learning_content_stable_refs', 'content_speech_bindings'],
    ['users', 'learning_activity_events'],
    ['topik_owner_srs_cards', 'topik_owner_review_logs'],
    ['topik_placement_attempts', 'topik_placement_responses'],
  ] as const) assert.ok(position.get(parent)! < position.get(child)!, `${parent} before ${child}`);
});
