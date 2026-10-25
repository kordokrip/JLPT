// 강성호 2026-10-12: 공개 도구가 운영/사용자 데이터로 확장되는 것을 회귀 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../seed/constants.js';
import { buildContentSeedPlan } from '../seed/content-manifest.js';
import { applyLearningPathV4DraftStage } from '../seed/learning-path-v4-draft.js';
import { loadReviewedV7 } from './learning-path-reviewed-release.js';
import { LEARNING_CONTENT_TABLES, LEARNING_PREVIEW_DATABASE, LEARNING_PREVIEW_TOKEN, requireLearningPreviewTarget, learningContentMirror } from './learning-path-preview-target.js';
const target = { remote:true, database:LEARNING_PREVIEW_DATABASE, env:'topik-preview', config:resolve(REPO_ROOT,'apps/api/wrangler.toml') };
test('learning publication accepts only explicit Preview binding and exact write token', () => {
  requireLearningPreviewTarget(target, false);
  requireLearningPreviewTarget(target, true, LEARNING_PREVIEW_TOKEN);
  for (const value of [{...target,database:'nihongo-n3-prod-v2'},{...target,database:'DB'},{...target,env:'production'},{...target,remote:false},{...target,persistTo:'/tmp/unowned'}])
    assert.throws(() => requireLearningPreviewTarget(value, false), /explicit dedicated/);
  assert.throws(() => requireLearningPreviewTarget(target, true, 'seed'), /requires/);
});
test('actual 440 draft content snapshot round-trip retains questions, links and speech without importing learner data', () => {
  const db = learningContentMirror({});
  const content = resolve(REPO_ROOT,'packages/db/src/content');
  const loaded = loadReviewedV7({cohort:resolve(content,'learning-path-v7-2026-10-11/frozen-cohort-01'),
    reviewA:resolve(content,'reviews/learning-path-v7-full-reviewer-a-cohort01-2026-10-11.json'),
    reviewB:resolve(content,'reviews/learning-path-v7-full-reviewer-b-cohort01-2026-10-11.json')});
  try {
    db.exec(buildContentSeedPlan().statements.join('\n'));
    applyLearningPathV4DraftStage(db,loaded.input);
    const snapshot = Object.fromEntries(LEARNING_CONTENT_TABLES.map(table => [table,db.prepare(`SELECT * FROM ${table}`).all()]));
    const copy = learningContentMirror(snapshot);
    try {
      for (const table of ['jlpt_practice_questions','topik_owner_authored_curriculum_items','learning_lessons','learning_lesson_entries','content_learning_links','content_speech_bindings','content_audio_bindings'])
        assert.deepEqual(copy.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
      assert.equal(copy.prepare('SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version=?').get('lp7-2026-10-11')!.n,200);
      assert.equal(copy.prepare('SELECT count(*) n FROM learning_lessons WHERE is_published=1').get()!.n,0);
      assert.deepEqual(copy.prepare('PRAGMA foreign_key_check').all(),[]);
    } finally { copy.close(); }
  } finally { db.close(); }
});
test('planning mirror excludes private tables and accepts actual content integer IDs without writes to an external DB', () => {
  for (const table of ['users','auth_sessions','study_sessions','study_steps','learning_annotations','srs_cards','review_logs','daily_logs','topik_owner_curriculum_progress'])
    assert.equal((LEARNING_CONTENT_TABLES as readonly string[]).includes(table), false);
  assert.throws(() => learningContentMirror({users:[]} as never), /Non-content/);
  const db = learningContentMirror({});
  try {
    assert.equal(db.prepare('SELECT count(*) n FROM learning_lessons').get()!.n, 0);
    assert.ok(Number(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='trigger'").get()!.n)>0);
  } finally { db.close(); }
});
