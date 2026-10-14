-- 강성호 2026-10-11: 기존 카드/진행률을 보존하고 검수된 개념-문제 레슨만 추가한다.
CREATE TABLE learning_lessons (
 id TEXT NOT NULL, version TEXT NOT NULL,
 learning_track TEXT NOT NULL CHECK(learning_track IN ('jlpt-ja','topik-ko')),
 level TEXT NOT NULL,
 ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 1 AND 20),
 title_ko TEXT NOT NULL CHECK(length(trim(title_ko))>0),
 title_ja TEXT NOT NULL CHECK(length(trim(title_ja))>0),
 title_en TEXT NOT NULL CHECK(length(trim(title_en))>0),
 release_id TEXT NOT NULL REFERENCES content_releases(id),
 is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0,1)),
 PRIMARY KEY(id,version), UNIQUE(learning_track,level,version,ordinal),
 CHECK((learning_track='jlpt-ja' AND level IN ('N5','N4','N3','N2','N1'))
 OR (learning_track='topik-ko' AND level IN ('1','2','3','4','5','6')))
);
CREATE UNIQUE INDEX learning_lessons_one_public_version ON learning_lessons(id) WHERE is_published=1;
CREATE TABLE learning_lesson_entries (
 lesson_id TEXT NOT NULL, lesson_version TEXT NOT NULL,
 ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 0 AND 3),
 phase TEXT NOT NULL CHECK(phase IN ('learn','practice')),
 content_ref TEXT NOT NULL,
 cue_ko TEXT NOT NULL DEFAULT '', cue_ja TEXT NOT NULL DEFAULT '', cue_en TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(lesson_id,lesson_version,ordinal),
 FOREIGN KEY(lesson_id,lesson_version) REFERENCES learning_lessons(id,version) ON DELETE CASCADE,
 CHECK((ordinal<2 AND phase='learn') OR (ordinal>=2 AND phase='practice')),
 UNIQUE(lesson_id,lesson_version,content_ref)
);
-- Additive seals retain every pre-0031 link as NULL. Only the verified draft builder
-- may supply snapshots; existing seals and their source/ref/reviewer binding never change.
ALTER TABLE content_learning_links ADD COLUMN expected_question_json TEXT CHECK(expected_question_json IS NULL OR json_valid(expected_question_json));
ALTER TABLE content_learning_links ADD COLUMN expected_lesson_json TEXT CHECK(expected_lesson_json IS NULL OR json_valid(expected_lesson_json));
ALTER TABLE content_learning_links ADD COLUMN expected_entries_json TEXT CHECK(expected_entries_json IS NULL OR json_valid(expected_entries_json));
-- Five-release publication is opt-in; legacy and the standalone V7 path stay NULL.
ALTER TABLE content_releases ADD COLUMN publication_cohort_id TEXT;
ALTER TABLE content_release_quality_audit_links ADD COLUMN expected_question_json TEXT CHECK(expected_question_json IS NULL OR json_valid(expected_question_json));
CREATE TRIGGER release_quality_link_seal_update BEFORE UPDATE ON content_release_quality_audit_links
WHEN OLD.expected_question_json IS NOT NULL
BEGIN SELECT RAISE(ABORT,'sealed quality link is immutable'); END;
CREATE TRIGGER release_quality_link_seal_delete BEFORE DELETE ON content_release_quality_audit_links
WHEN OLD.expected_question_json IS NOT NULL
BEGIN SELECT RAISE(ABORT,'sealed quality link cannot be deleted'); END;
CREATE TRIGGER release_quality_link_seal_replace BEFORE INSERT ON content_release_quality_audit_links
WHEN EXISTS(SELECT 1 FROM content_release_quality_audit_links q WHERE q.release_id=NEW.release_id AND q.audit_id=NEW.audit_id
 AND q.expected_question_json IS NOT NULL AND q.expected_question_json IS NOT NEW.expected_question_json)
BEGIN SELECT RAISE(ABORT,'sealed quality link replacement is immutable'); END;
CREATE TRIGGER content_learning_links_sealed_update BEFORE UPDATE ON content_learning_links
WHEN OLD.expected_question_json IS NOT NULL OR OLD.expected_lesson_json IS NOT NULL OR OLD.expected_entries_json IS NOT NULL
BEGIN SELECT RAISE(ABORT,'sealed learning link is immutable'); END;
CREATE TRIGGER content_learning_links_sealed_delete BEFORE DELETE ON content_learning_links
WHEN OLD.expected_question_json IS NOT NULL OR OLD.expected_lesson_json IS NOT NULL OR OLD.expected_entries_json IS NOT NULL
BEGIN SELECT RAISE(ABORT,'sealed learning link cannot be deleted'); END;
-- REPLACE can bypass DELETE triggers with recursive_triggers=OFF. Equal OR IGNORE
-- reseeds remain safe; a replacement may never weaken or rewrite a sealed key.
CREATE TRIGGER content_learning_links_sealed_replace BEFORE INSERT ON content_learning_links
WHEN EXISTS(SELECT 1 FROM content_learning_links old
 WHERE old.learning_track=NEW.learning_track AND old.question_ref=NEW.question_ref AND old.concept_ref=NEW.concept_ref
 AND (old.expected_question_json IS NOT NULL OR old.expected_lesson_json IS NOT NULL OR old.expected_entries_json IS NOT NULL)
 AND (old.evidence_sha256 IS NOT NEW.evidence_sha256 OR old.reviewer_a IS NOT NEW.reviewer_a
 OR old.reviewer_b IS NOT NEW.reviewer_b OR old.status IS NOT NEW.status OR old.created_at IS NOT NEW.created_at
 OR old.expected_question_json IS NOT NEW.expected_question_json OR old.expected_lesson_json IS NOT NEW.expected_lesson_json
 OR old.expected_entries_json IS NOT NEW.expected_entries_json))
BEGIN SELECT RAISE(ABORT,'sealed learning link replacement is immutable'); END;
-- 공개 release와 승인 연결이 갖춰져야 하며 INSERT로 공개 절차를 우회하지 못한다.
CREATE TRIGGER learning_lessons_no_published_insert BEFORE INSERT ON learning_lessons
WHEN NEW.is_published=1 BEGIN SELECT RAISE(ABORT,'insert lessons as draft'); END;
CREATE TRIGGER learning_lessons_publish_gate BEFORE UPDATE OF is_published ON learning_lessons
WHEN NEW.is_published=1 AND (
 NOT EXISTS(SELECT 1 FROM content_releases r WHERE r.id=NEW.release_id AND r.learning_track=NEW.learning_track AND r.release_state='published')
 OR (SELECT count(*) FROM learning_lesson_entries e WHERE e.lesson_id=NEW.id AND e.lesson_version=NEW.version)<>4
 OR (SELECT count(*) FROM learning_lesson_entries q WHERE q.lesson_id=NEW.id AND q.lesson_version=NEW.version AND q.phase='practice'
 AND EXISTS(SELECT 1 FROM learning_lesson_entries c JOIN content_learning_links l ON l.concept_ref=c.content_ref AND l.question_ref=q.content_ref
 AND l.learning_track=NEW.learning_track AND l.status='approved'
 WHERE c.lesson_id=NEW.id AND c.lesson_version=NEW.version AND c.phase='learn' AND c.ordinal=q.ordinal-2))<>2
)
BEGIN SELECT RAISE(ABORT,'lesson release/link gate failed'); END;
-- 공개 또는 세션에 사용한 내용은 변경하지 않고 새 version을 만든다.
CREATE TRIGGER learning_lesson_entries_frozen_insert BEFORE INSERT ON learning_lesson_entries
WHEN EXISTS(SELECT 1 FROM learning_lessons l WHERE l.id=NEW.lesson_id AND l.version=NEW.lesson_version AND l.is_published=1)
 OR EXISTS(SELECT 1 FROM study_sessions s WHERE s.lesson_id=NEW.lesson_id AND s.lesson_version=NEW.lesson_version)
BEGIN SELECT RAISE(ABORT,'used lesson entries are immutable'); END;
CREATE TRIGGER learning_lesson_entries_frozen_update BEFORE UPDATE ON learning_lesson_entries
WHEN EXISTS(SELECT 1 FROM learning_lessons l WHERE l.id=OLD.lesson_id AND l.version=OLD.lesson_version AND l.is_published=1)
 OR EXISTS(SELECT 1 FROM study_sessions s WHERE s.lesson_id=OLD.lesson_id AND s.lesson_version=OLD.lesson_version)
BEGIN SELECT RAISE(ABORT,'published lesson entries are immutable'); END;
CREATE TRIGGER learning_lesson_entries_frozen_delete BEFORE DELETE ON learning_lesson_entries
WHEN EXISTS(SELECT 1 FROM learning_lessons l WHERE l.id=OLD.lesson_id AND l.version=OLD.lesson_version AND l.is_published=1)
 OR EXISTS(SELECT 1 FROM study_sessions s WHERE s.lesson_id=OLD.lesson_id AND s.lesson_version=OLD.lesson_version)
BEGIN SELECT RAISE(ABORT,'published lesson entries are immutable'); END;
ALTER TABLE study_sessions ADD COLUMN lesson_id TEXT;
ALTER TABLE study_sessions ADD COLUMN lesson_version TEXT;
CREATE INDEX study_sessions_lesson_history ON study_sessions(user_id,learning_track,lesson_id,lesson_version,status);
CREATE TRIGGER learning_lessons_frozen_definition BEFORE UPDATE OF id,version,learning_track,level,ordinal,title_ko,title_ja,title_en,release_id ON learning_lessons
WHEN OLD.is_published=1 OR EXISTS(SELECT 1 FROM study_sessions s WHERE s.lesson_id=OLD.id AND s.lesson_version=OLD.version)
BEGIN SELECT RAISE(ABORT,'used lesson definition is immutable'); END;
CREATE TRIGGER learning_lessons_preserve_session BEFORE DELETE ON learning_lessons
WHEN EXISTS(SELECT 1 FROM study_sessions s WHERE s.lesson_id=OLD.id AND s.lesson_version=OLD.version)
BEGIN SELECT RAISE(ABORT,'lesson has saved sessions'); END;
CREATE TRIGGER study_sessions_lesson_contract BEFORE INSERT ON study_sessions
WHEN (NEW.lesson_id IS NULL)<>(NEW.lesson_version IS NULL)
 OR (NEW.lesson_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM learning_lessons l WHERE l.id=NEW.lesson_id AND l.version=NEW.lesson_version
 AND l.learning_track=NEW.learning_track AND l.level=NEW.level AND l.is_published=1
 AND EXISTS(SELECT 1 FROM content_releases r WHERE r.id=l.release_id AND r.release_state='published')))
BEGIN SELECT RAISE(ABORT,'invalid or unpublished lesson binding'); END;
CREATE TRIGGER study_sessions_lesson_frozen BEFORE UPDATE OF lesson_id,lesson_version ON study_sessions
WHEN NEW.lesson_id IS NOT OLD.lesson_id OR NEW.lesson_version IS NOT OLD.lesson_version
BEGIN SELECT RAISE(ABORT,'session lesson binding is immutable'); END;
-- 강성호 2026-10-11: 공개 검사 직후 철회되는 경합도 첫 claim에서 막아 batch 효과를 전부 취소한다.
CREATE TRIGGER study_steps_lesson_write_guard BEFORE UPDATE OF request_id,revealed ON study_steps
WHEN (NEW.request_id IS NOT OLD.request_id OR NEW.revealed IS NOT OLD.revealed)
 AND EXISTS(SELECT 1 FROM study_sessions s WHERE s.id=OLD.session_id AND s.lesson_id IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM learning_lessons l JOIN content_releases r ON r.id=l.release_id
 WHERE l.id=s.lesson_id AND l.version=s.lesson_version AND l.learning_track=s.learning_track
 AND l.is_published=1 AND r.learning_track=s.learning_track AND r.release_state='published'))
BEGIN SELECT RAISE(ABORT,'lesson withdrawn before write'); END;
-- V7 publisher: all public surfaces change inside the final two-release UPDATE.
-- D1 file imports need not wrap earlier staging statements in a transaction.
-- Wrangler's splitter recognizes CASE only after whitespace; comparisons such as
-- '=CASE' corrupt its BEGIN/END stack. Use IIF/mapping and RAISE ... WHERE throughout.
CREATE TRIGGER learning_path_v7_publish_integrity BEFORE UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11') AND NEW.release_state='published'
BEGIN
 SELECT RAISE(ABORT,'V7 publication profile/evidence/count integrity failed') WHERE NEW.content_version<>'lp7-2026-10-11'
 OR NEW.manifest_sha256<>'b1c7dda3b31d4bac030348f882c1786826588df83485a0f5573063a0a41b5871'
 OR NEW.parser_version<>'learning-path-quality-v1'
 OR (SELECT count(*) FROM content_releases r WHERE r.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11') AND r.release_state IN ('approved','published'))<>2
 OR NOT EXISTS(SELECT 1 FROM content_release_quality_requirements q WHERE q.release_id=NEW.id
 AND q.expected_audit_count=iif(NEW.learning_track='jlpt-ja',200,240)
 AND q.content_type=iif(NEW.learning_track='jlpt-ja','jlpt-quiz','topik-owner')
 AND q.validator_version=NEW.parser_version)
 OR (SELECT count(*) FROM learning_lessons l WHERE l.release_id=NEW.id AND l.version=NEW.content_version AND l.learning_track=NEW.learning_track AND l.is_published=0)<>iif(NEW.learning_track='jlpt-ja',100,120)
 OR (SELECT count(*) FROM learning_lesson_entries e JOIN learning_lessons l ON l.id=e.lesson_id AND l.version=e.lesson_version WHERE l.release_id=NEW.id)<>iif(NEW.learning_track='jlpt-ja',400,480)
 OR (SELECT count(*) FROM content_release_quality_audit_links x JOIN content_quality_audits a ON a.id=x.audit_id
 WHERE x.release_id=NEW.id AND a.learning_track=NEW.learning_track AND a.content_version=NEW.content_version
 AND a.validator_version=NEW.parser_version AND a.evidence_sha256='f7f130d0322271ce5c264d728f423212fc3a37dfaf98d8169ffe7844d7cde2a7'
 AND a.automated_status='passed' AND a.author_review_status='signed' AND a.adversarial_review_status='signed'
 AND a.author_reviewer<>a.adversarial_reviewer AND a.release_state='approved')<>iif(NEW.learning_track='jlpt-ja',200,240)
 OR (SELECT count(DISTINCT j.job_kind) FROM content_release_jobs j WHERE j.release_id=NEW.id AND j.job_state='succeeded'
 AND EXISTS(SELECT 1 FROM content_release_gate_evidence g WHERE g.release_id=NEW.id AND g.gate_state='passed'
 AND g.gate=json_extract('{"ingest":"G0","ai_draft":"G1","validate":"G2","qa":"G2","human_approval":"G3","preview_candidate":"G4"}','$.'||j.job_kind)
 AND g.artifact_sha256=j.artifact_sha256 AND g.artifact_key=j.artifact_key))<>6
 OR (SELECT count(*) FROM learning_lessons l JOIN learning_lesson_entries p ON p.lesson_id=l.id AND p.lesson_version=l.version AND p.phase='practice'
 JOIN learning_lesson_entries c ON c.lesson_id=l.id AND c.lesson_version=l.version AND c.ordinal=p.ordinal-2 AND c.phase='learn'
 JOIN content_learning_links x ON x.learning_track=l.learning_track AND x.question_ref=p.content_ref AND x.concept_ref=c.content_ref
 WHERE l.release_id=NEW.id AND x.status='approved' AND x.evidence_sha256='f7f130d0322271ce5c264d728f423212fc3a37dfaf98d8169ffe7844d7cde2a7'
 AND x.reviewer_a='astra-independent-reviewer-a-v7-cohort01-2026-10-11' AND x.reviewer_b='independent-semantic-reviewer-b-v7-cohort01-2026-10-11')<>iif(NEW.learning_track='jlpt-ja',200,240)
 OR NOT EXISTS(SELECT 1 FROM content_release_preview_candidates p WHERE p.release_id=NEW.id AND p.candidate_state='ready' AND p.manifest_sha256=NEW.manifest_sha256)
 OR NOT EXISTS(SELECT 1 FROM content_release_sources s WHERE s.release_id=NEW.id AND s.source_type='self-authored'
 AND s.source_sha256='f7f130d0322271ce5c264d728f423212fc3a37dfaf98d8169ffe7844d7cde2a7'
 AND json_valid(s.attribution_text) AND json_extract(s.attribution_text,'$.schema')='learning-path-v7-evidence-binding-v1'
 AND json_extract(s.attribution_text,'$.draft_sha256')=NEW.manifest_sha256
 AND json_extract(s.attribution_text,'$.concept_inventory_sha256')='85515cb49ac8462875c4863c38083880f426939e8f681d20d26a7e88b5989027'
 AND json_extract(s.attribution_text,'$.reviews[0].sha256')='db1f4a0f9f174b48a02d730aeb93a2241cd9889770f6bf090e067d2a0a8ff52a'
 AND json_extract(s.attribution_text,'$.reviews[1].sha256')='ac0697d587f71816333a1931c181fa254477d72758731e85b150c88781d1d554'
 AND (SELECT count(*) FROM content_release_gate_evidence g WHERE g.release_id=NEW.id AND g.gate_state='passed'
 AND g.artifact_sha256=json_extract(s.attribution_text,'$.artifacts.'||g.gate||'.sha256'))=5);
 SELECT RAISE(ABORT,'V7 question/audio integrity failed') WHERE (NEW.learning_track='jlpt-ja' AND (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version=NEW.content_version AND is_published=0 AND source_evidence_sha256='f7f130d0322271ce5c264d728f423212fc3a37dfaf98d8169ffe7844d7cde2a7')<>200)
 OR (NEW.learning_track='topik-ko' AND (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id='learning-path-v7-2026-10-11-source')<>240)
 OR (SELECT count(*) FROM content_speech_bindings WHERE item_id LIKE 'lp7-%' AND provider='google-browser' AND language='ko' AND binding_state='ready')<>48
 OR (SELECT count(*) FROM content_speech_bindings WHERE item_id LIKE 'lp7-%')<>48
 OR EXISTS(SELECT 1 FROM content_audio_bindings WHERE item_id LIKE 'lp7-%');
END;
-- The final visibility statement rechecks sealed learning fields, not just counts/hashes.
-- created_at/updated_at are operational metadata, not question/lesson semantics.
-- Seal bytes originate from the frozen/review-verified builder; command logs and their
-- authorship remain an explicit operator trust boundary, not a cryptographic signature.
-- D1 limits expression-tree depth to 100. Keep each semantic AND group bounded:
-- the WHEN condition does not prevent SQLite compiling this body for other releases.
CREATE TRIGGER learning_path_v7_publish_sealed_content BEFORE UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11') AND NEW.release_state='published'
BEGIN
 SELECT RAISE(ABORT,'V7 sealed content changed before visibility commit') WHERE (
 SELECT count(DISTINCT a.id) FROM content_release_quality_audit_links qa
 JOIN content_quality_audits a ON a.id=qa.audit_id AND a.learning_track=NEW.learning_track AND a.content_version=NEW.content_version
 JOIN content_learning_links x ON x.learning_track=a.learning_track AND json_extract(x.expected_question_json,'$.row.id')=a.content_id
 JOIN learning_lessons l ON l.id=json_extract(x.expected_lesson_json,'$.id') AND l.version=NEW.content_version AND l.release_id=NEW.id
 JOIN learning_lesson_entries c ON c.lesson_id=l.id AND c.lesson_version=l.version AND c.phase='learn' AND c.content_ref=x.concept_ref
 JOIN learning_lesson_entries p ON p.lesson_id=l.id AND p.lesson_version=l.version AND p.ordinal=c.ordinal+2 AND p.phase='practice' AND p.content_ref=x.question_ref
 LEFT JOIN jlpt_practice_questions jq ON NEW.learning_track='jlpt-ja' AND jq.id=a.content_id
 LEFT JOIN topik_owner_authored_curriculum_items tq ON NEW.learning_track='topik-ko' AND tq.id=a.content_id
 LEFT JOIN topik_owner_authored_curriculum_units u ON u.id=tq.unit_id
 WHERE qa.release_id=NEW.id
 AND json_type(x.expected_question_json)='object' AND json_type(x.expected_question_json,'$.row')='object'
 AND json_type(x.expected_lesson_json)='object'
 AND json_type(x.expected_entries_json)='array' AND json_array_length(x.expected_entries_json)=2
 AND x.status='approved' AND x.evidence_sha256=a.evidence_sha256
 AND x.reviewer_a=a.author_reviewer AND x.reviewer_b=a.adversarial_reviewer
 AND (l.id IS json_extract(x.expected_lesson_json,'$.id')
 AND l.version IS json_extract(x.expected_lesson_json,'$.version')
 AND l.learning_track IS json_extract(x.expected_lesson_json,'$.learning_track')
 AND l.level IS json_extract(x.expected_lesson_json,'$.level')
 AND l.ordinal IS json_extract(x.expected_lesson_json,'$.ordinal')
 AND l.title_ko IS json_extract(x.expected_lesson_json,'$.title_ko')
 AND l.title_ja IS json_extract(x.expected_lesson_json,'$.title_ja')
 AND l.title_en IS json_extract(x.expected_lesson_json,'$.title_en')
 AND l.release_id IS json_extract(x.expected_lesson_json,'$.release_id')
 AND l.is_published IS json_extract(x.expected_lesson_json,'$.is_published'))
 AND (c.lesson_id IS json_extract(x.expected_entries_json,'$[0].lesson_id')
 AND c.lesson_version IS json_extract(x.expected_entries_json,'$[0].lesson_version')
 AND c.ordinal IS json_extract(x.expected_entries_json,'$[0].ordinal')
 AND c.phase IS json_extract(x.expected_entries_json,'$[0].phase')
 AND c.content_ref IS json_extract(x.expected_entries_json,'$[0].content_ref')
 AND c.cue_ko IS json_extract(x.expected_entries_json,'$[0].cue_ko')
 AND c.cue_ja IS json_extract(x.expected_entries_json,'$[0].cue_ja')
 AND c.cue_en IS json_extract(x.expected_entries_json,'$[0].cue_en'))
 AND (p.lesson_id IS json_extract(x.expected_entries_json,'$[1].lesson_id')
 AND p.lesson_version IS json_extract(x.expected_entries_json,'$[1].lesson_version')
 AND p.ordinal IS json_extract(x.expected_entries_json,'$[1].ordinal')
 AND p.phase IS json_extract(x.expected_entries_json,'$[1].phase')
 AND p.content_ref IS json_extract(x.expected_entries_json,'$[1].content_ref')
 AND p.cue_ko IS json_extract(x.expected_entries_json,'$[1].cue_ko')
 AND p.cue_ja IS json_extract(x.expected_entries_json,'$[1].cue_ja')
 AND p.cue_en IS json_extract(x.expected_entries_json,'$[1].cue_en'))
 AND ((NEW.learning_track='jlpt-ja' AND jq.id IS NOT NULL
 AND x.question_ref='jlpt-ja:jlpt-practice:'||jq.id||':'||jq.bank_version
 AND json_type(x.expected_question_json,'$.unit')='null'
 AND json_type(x.expected_question_json,'$.speech')='null'
 AND (jq.id IS json_extract(x.expected_question_json,'$.row.id')
 AND jq.learning_track IS json_extract(x.expected_question_json,'$.row.learning_track')
 AND jq.level IS json_extract(x.expected_question_json,'$.row.level')
 AND jq.mode IS json_extract(x.expected_question_json,'$.row.mode')
 AND jq.skill IS json_extract(x.expected_question_json,'$.row.skill')
 AND jq.difficulty IS json_extract(x.expected_question_json,'$.row.difficulty'))
 AND (jq.prompt_ko IS json_extract(x.expected_question_json,'$.row.prompt_ko')
 AND jq.prompt_ja IS json_extract(x.expected_question_json,'$.row.prompt_ja')
 AND jq.prompt_en IS json_extract(x.expected_question_json,'$.row.prompt_en')
 AND jq.choices_json IS json_extract(x.expected_question_json,'$.row.choices_json')
 AND jq.answer_index IS json_extract(x.expected_question_json,'$.row.answer_index'))
 AND (jq.explanation_ko IS json_extract(x.expected_question_json,'$.row.explanation_ko')
 AND jq.explanation_ja IS json_extract(x.expected_question_json,'$.row.explanation_ja')
 AND jq.explanation_en IS json_extract(x.expected_question_json,'$.row.explanation_en')
 AND jq.audio_script_ja IS json_extract(x.expected_question_json,'$.row.audio_script_ja')
 AND jq.source_code IS json_extract(x.expected_question_json,'$.row.source_code')
 AND jq.source_evidence_sha256 IS json_extract(x.expected_question_json,'$.row.source_evidence_sha256')
 AND jq.bank_version IS json_extract(x.expected_question_json,'$.row.bank_version')
 AND jq.is_published IS json_extract(x.expected_question_json,'$.row.is_published')))
 OR (NEW.learning_track='topik-ko' AND tq.id IS NOT NULL
 AND substr(x.question_ref,1,length('topik-ko:topik-owner-item:'||tq.id||':'))='topik-ko:topik-owner-item:'||tq.id||':'
 AND json_type(x.expected_question_json,'$.unit')='object'
 AND (tq.id IS json_extract(x.expected_question_json,'$.row.id')
 AND tq.unit_id IS json_extract(x.expected_question_json,'$.row.unit_id')
 AND tq.target_grade IS json_extract(x.expected_question_json,'$.row.target_grade')
 AND tq.stable_ref IS json_extract(x.expected_question_json,'$.row.stable_ref')
 AND tq.item_type IS json_extract(x.expected_question_json,'$.row.item_type'))
 AND (tq.prompt_ko IS json_extract(x.expected_question_json,'$.row.prompt_ko')
 AND tq.prompt_ja IS json_extract(x.expected_question_json,'$.row.prompt_ja')
 AND tq.prompt_en IS json_extract(x.expected_question_json,'$.row.prompt_en')
 AND tq.answer_json IS json_extract(x.expected_question_json,'$.row.answer_json'))
 AND (tq.explanation_ko IS json_extract(x.expected_question_json,'$.row.explanation_ko')
 AND tq.explanation_ja IS json_extract(x.expected_question_json,'$.row.explanation_ja')
 AND tq.explanation_en IS json_extract(x.expected_question_json,'$.row.explanation_en')
 AND tq.audio_required IS json_extract(x.expected_question_json,'$.row.audio_required')
 AND tq.source_asset_id IS json_extract(x.expected_question_json,'$.row.source_asset_id')
 AND tq.audio_text_ko IS json_extract(x.expected_question_json,'$.row.audio_text_ko'))
 AND (u.id IS json_extract(x.expected_question_json,'$.unit.id')
 AND u.target_grade IS json_extract(x.expected_question_json,'$.unit.target_grade')
 AND u.stable_ref IS json_extract(x.expected_question_json,'$.unit.stable_ref')
 AND u.section IS json_extract(x.expected_question_json,'$.unit.section')
 AND u.title_ko IS json_extract(x.expected_question_json,'$.unit.title_ko')
 AND u.title_ja IS json_extract(x.expected_question_json,'$.unit.title_ja')
 AND u.title_en IS json_extract(x.expected_question_json,'$.unit.title_en')
 AND u.source_asset_id IS json_extract(x.expected_question_json,'$.unit.source_asset_id'))
 AND ((tq.audio_required=0 AND json_type(x.expected_question_json,'$.speech')='null'
 AND NOT EXISTS(SELECT 1 FROM content_speech_bindings s WHERE s.item_id=tq.id))
 OR (tq.audio_required=1 AND json_type(x.expected_question_json,'$.speech')='object'
 AND EXISTS(SELECT 1 FROM content_speech_bindings s
 JOIN learning_content_stable_refs stable ON stable.stable_ref=s.stable_ref
 WHERE s.item_id=tq.id AND s.item_type='topik-owner-item'
 AND stable.item_id=tq.id AND stable.learning_track='topik-ko' AND stable.source_asset_id=tq.source_asset_id
 AND stable.item_type=s.item_type AND stable.level_tag='grade-'||tq.target_grade
 AND (s.id IS json_extract(x.expected_question_json,'$.speech.id')
 AND s.stable_ref IS json_extract(x.expected_question_json,'$.speech.stable_ref')
 AND s.item_type IS json_extract(x.expected_question_json,'$.speech.item_type')
 AND s.item_id IS json_extract(x.expected_question_json,'$.speech.item_id')
 AND s.language IS json_extract(x.expected_question_json,'$.speech.language')
 AND s.speech_role IS json_extract(x.expected_question_json,'$.speech.speech_role')
 AND s.provider IS json_extract(x.expected_question_json,'$.speech.provider')
 AND s.binding_state IS json_extract(x.expected_question_json,'$.speech.binding_state')
 AND s.text_source IS json_extract(x.expected_question_json,'$.speech.text_source')
 AND s.unavailable_reason IS json_extract(x.expected_question_json,'$.speech.unavailable_reason')))))))
 )<>iif(NEW.learning_track='jlpt-ja',200,240)
 OR (SELECT count(*) FROM content_learning_links WHERE question_ref LIKE '%:lp7-%')<>440;
END;
CREATE TRIGGER learning_path_v7_publish_visibility AFTER UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11') AND NEW.release_state='published'
BEGIN
 UPDATE content_quality_audits SET release_state='published' WHERE id IN (SELECT audit_id FROM content_release_quality_audit_links WHERE release_id=NEW.id);
 UPDATE jlpt_practice_questions SET is_published=1 WHERE NEW.learning_track='jlpt-ja' AND bank_version=NEW.content_version;
 UPDATE learning_lessons SET is_published=1 WHERE release_id=NEW.id AND version=NEW.content_version;
END;
CREATE TRIGGER learning_path_v7_withdraw_visibility AFTER UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11') AND NEW.release_state='withdrawn'
BEGIN
 UPDATE learning_lessons SET is_published=0 WHERE release_id=NEW.id AND version=NEW.content_version;
 UPDATE jlpt_practice_questions SET is_published=0 WHERE NEW.learning_track='jlpt-ja' AND bank_version=NEW.content_version;
 UPDATE content_quality_audits SET release_state='withdrawn' WHERE id IN (SELECT audit_id FROM content_release_quality_audit_links WHERE release_id=NEW.id);
END;
CREATE TRIGGER study_sessions_lesson_status_guard BEFORE UPDATE OF status ON study_sessions
WHEN NEW.status IS NOT OLD.status AND NEW.status<>'abandoned' AND OLD.lesson_id IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM learning_lessons l JOIN content_releases r ON r.id=l.release_id
 WHERE l.id=OLD.lesson_id AND l.version=OLD.lesson_version AND l.learning_track=OLD.learning_track
 AND l.is_published=1 AND r.learning_track=OLD.learning_track AND r.release_state='published')
BEGIN SELECT RAISE(ABORT,'lesson withdrawn before write'); END;
-- Coordinator protocol: one UPDATE commits/withdraws all five releases in the same
-- SQLite statement. Direct noncoordinator entry cannot expose a partial cohort.
CREATE TRIGGER learning_cohort_identity_insert BEFORE INSERT ON content_releases
WHEN NEW.publication_cohort_id IS NOT NULL AND
 (NEW.publication_cohort_id<>'learning-cohort-600-2026-10-13' OR NEW.id NOT IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11','preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') OR NEW.release_state<>'draft')
BEGIN SELECT RAISE(ABORT,'invalid learning cohort identity'); END;
CREATE TRIGGER learning_cohort_identity_update BEFORE UPDATE OF publication_cohort_id ON content_releases
WHEN NEW.publication_cohort_id IS NOT OLD.publication_cohort_id AND NOT
 (OLD.publication_cohort_id IS NULL AND NEW.publication_cohort_id='learning-cohort-600-2026-10-13' AND OLD.release_state='draft' AND NEW.release_state='draft' AND NEW.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11','preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12'))
BEGIN SELECT RAISE(ABORT,'learning cohort identity is immutable'); END;
CREATE TRIGGER learning_cohort_release_identity_frozen BEFORE UPDATE OF id,learning_track,content_version,manifest_sha256,parser_version ON content_releases
WHEN OLD.publication_cohort_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'learning cohort release identity is immutable'); END;
CREATE TRIGGER learning_cohort_release_no_delete BEFORE DELETE ON content_releases
WHEN OLD.publication_cohort_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'learning cohort release cannot be deleted'); END;
CREATE TRIGGER learning_cohort_release_no_replace BEFORE INSERT ON content_releases
WHEN EXISTS(SELECT 1 FROM content_releases r WHERE r.id=NEW.id AND r.publication_cohort_id IS NOT NULL)
-- Preserve the existing row even for REPLACE (DELETE hooks depend on recursive_triggers).
-- Equal OR IGNORE seed replay must remain harmless; builders separately reject collisions.
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER preview160_v3_no_public_insert BEFORE INSERT ON content_releases
WHEN NEW.id IN ('preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') AND NEW.release_state<>'draft'
BEGIN SELECT RAISE(ABORT,'V3 releases must enter as draft'); END;
CREATE TRIGGER learning_cohort_publish_guard BEFORE UPDATE OF release_state ON content_releases
WHEN (NEW.publication_cohort_id='learning-cohort-600-2026-10-13' OR NEW.id IN ('preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12')) AND NEW.release_state='published'
BEGIN
 SELECT RAISE(ABORT,'five-release coordinator preparation required') WHERE
 NEW.publication_cohort_id IS NOT 'learning-cohort-600-2026-10-13'
 OR (SELECT count(*) FROM content_releases r WHERE r.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11','preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') AND r.publication_cohort_id='learning-cohort-600-2026-10-13' AND r.release_state IN ('approved','published'))<>5
 OR (NEW.id='learning-path-jlpt-lp7-2026-10-11' AND (SELECT count(*) FROM content_releases r WHERE r.id IN ('learning-path-jlpt-lp7-2026-10-11','learning-path-topik-lp7-2026-10-11','preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') AND r.release_state='approved')<>5)
 OR (NEW.id<>'learning-path-jlpt-lp7-2026-10-11' AND NOT EXISTS(SELECT 1 FROM content_releases r WHERE r.id='learning-path-jlpt-lp7-2026-10-11' AND r.publication_cohort_id=NEW.publication_cohort_id AND r.release_state='published'))
 OR (SELECT count(*) FROM content_release_gate_evidence g JOIN content_releases r ON r.id=g.release_id
 WHERE r.publication_cohort_id=NEW.publication_cohort_id AND g.gate_state='passed')<>25
 OR (SELECT count(DISTINCT g.artifact_sha256) FROM content_release_gate_evidence g JOIN content_releases r ON r.id=g.release_id
 WHERE r.publication_cohort_id=NEW.publication_cohort_id AND g.gate='G4' AND g.gate_state='passed')<>1;
 SELECT RAISE(ABORT,'cohort source authorization binding required') WHERE NOT EXISTS(
 SELECT 1 FROM content_release_sources s WHERE s.release_id=NEW.id AND json_valid(s.attribution_text)
 AND json_extract(s.attribution_text,'$.publication_cohort_id')=NEW.publication_cohort_id
 AND length(json_extract(s.attribution_text,'$.candidate_sha'))=40
 AND json_extract(s.attribution_text,'$.phase') IN ('local','preview','production-predeploy')
 AND (SELECT count(*) FROM content_release_gate_evidence g WHERE g.release_id=NEW.id AND g.gate_state='passed'
 AND g.artifact_sha256=json_extract(s.attribution_text,'$.artifacts.'||g.gate||'.sha256'))=5);
END;
CREATE TRIGGER learning_cohort_publish_cascade AFTER UPDATE OF release_state ON content_releases
WHEN NEW.id='learning-path-jlpt-lp7-2026-10-11' AND NEW.publication_cohort_id='learning-cohort-600-2026-10-13' AND NEW.release_state='published'
BEGIN
 UPDATE content_releases SET release_state='published',published_at=COALESCE(published_at,NEW.published_at,unixepoch())
 WHERE publication_cohort_id=NEW.publication_cohort_id AND id<>NEW.id AND release_state='approved';
END;
CREATE TRIGGER learning_cohort_withdraw_guard BEFORE UPDATE OF release_state ON content_releases
WHEN NEW.publication_cohort_id='learning-cohort-600-2026-10-13' AND NEW.release_state='withdrawn'
BEGIN
 SELECT RAISE(ABORT,'five-release coordinator withdrawal required') WHERE
 (NEW.id='learning-path-jlpt-lp7-2026-10-11' AND (SELECT count(*) FROM content_releases WHERE publication_cohort_id=NEW.publication_cohort_id AND release_state='published')<>5)
 OR (NEW.id<>'learning-path-jlpt-lp7-2026-10-11' AND NOT EXISTS(SELECT 1 FROM content_releases r WHERE r.id='learning-path-jlpt-lp7-2026-10-11' AND r.publication_cohort_id=NEW.publication_cohort_id AND r.release_state='withdrawn'));
END;
CREATE TRIGGER learning_cohort_withdraw_cascade AFTER UPDATE OF release_state ON content_releases
WHEN NEW.id='learning-path-jlpt-lp7-2026-10-11' AND NEW.publication_cohort_id='learning-cohort-600-2026-10-13' AND NEW.release_state='withdrawn'
BEGIN
 UPDATE content_releases SET release_state='withdrawn',withdrawn_at=COALESCE(NEW.withdrawn_at,unixepoch())
 WHERE publication_cohort_id=NEW.publication_cohort_id AND id<>NEW.id AND release_state='published';
END;
CREATE TRIGGER preview160_v3_publish_seals BEFORE UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') AND NEW.release_state='published'
BEGIN
 SELECT RAISE(ABORT,'V3 exact quality profile required') WHERE
 NEW.manifest_sha256<>'de8b459e06474fc1454b46139e4ab3a65c9692a8ee54a23ea26e702e87b61a9b'
 OR NEW.parser_version<>'preview160-v3-quality-v1'
 OR NOT EXISTS(SELECT 1 FROM content_release_quality_requirements q WHERE q.release_id=NEW.id
 AND q.expected_audit_count=iif(NEW.learning_track='jlpt-ja',60,40) AND q.validator_version=NEW.parser_version
 AND q.content_type=iif(NEW.learning_track='jlpt-ja','jlpt-quiz','topik-owner'))
 OR (SELECT count(*) FROM content_release_quality_audit_links qa WHERE qa.release_id=NEW.id)<>iif(NEW.learning_track='jlpt-ja',60,40);
 SELECT RAISE(ABORT,'V3 exact source/job evidence required') WHERE
 NOT EXISTS(SELECT 1 FROM content_release_sources s WHERE s.release_id=NEW.id AND s.source_type='self-authored'
 AND s.source_sha256='c5e2548381420c785909d787e9a316a1cc6057e0fc777702aa4ebfe33db73c66'
 AND json_valid(s.attribution_text) AND json_extract(s.attribution_text,'$.schema')='preview160-v3-evidence-binding-v1'
 AND json_extract(s.attribution_text,'$.draft_sha256')='4934aa390878bd6ac2becd9ec4e930eafb7e72423b98b492430a83b1747ffd6f'
 AND json_extract(s.attribution_text,'$.manifest_sha256')=NEW.manifest_sha256
 AND json_extract(s.attribution_text,'$.reviews[0].sha256')='6fc06d143e2d87f65813550ca8b3ffa5a1ed44038faf0f72f8ef662928e705e1'
 AND json_extract(s.attribution_text,'$.reviews[1].sha256')='57246e3ce6feec1873f9bbd42652b00b4dc41ab76dc29f9a60a782c443acfd6f')
 OR (SELECT count(DISTINCT j.job_kind) FROM content_release_jobs j WHERE j.release_id=NEW.id AND j.job_state='succeeded'
 AND EXISTS(SELECT 1 FROM content_release_gate_evidence g WHERE g.release_id=NEW.id AND g.gate_state='passed'
 AND g.gate=json_extract('{"ingest":"G0","ai_draft":"G1","validate":"G2","qa":"G2","human_approval":"G3","preview_candidate":"G4"}','$.'||j.job_kind)
 AND g.artifact_sha256=j.artifact_sha256 AND g.artifact_key=j.artifact_key))<>6
 OR NOT EXISTS(SELECT 1 FROM content_release_preview_candidates p WHERE p.release_id=NEW.id AND p.candidate_state='ready' AND p.manifest_sha256=NEW.manifest_sha256);
 SELECT RAISE(ABORT,'V3 exact question/audio cardinality required') WHERE
 (NEW.learning_track='jlpt-ja' AND ((SELECT count(*) FROM jlpt_practice_questions WHERE bank_version=NEW.content_version)<>60
 OR (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version=NEW.content_version AND is_published=0)<>60))
 OR (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id='preview160-v3-2026-10-12-source')<>40
 OR (SELECT count(*) FROM topik_owner_authored_curriculum_units WHERE source_asset_id='preview160-v3-2026-10-12-source')<>40
 OR (SELECT count(*) FROM content_speech_bindings s JOIN content_quality_audits a ON a.content_id=s.item_id
 WHERE a.content_version IN ('preview160-v3-2026-10-12:N2','preview160-v3-2026-10-12:N1','preview160-v3-2026-10-12:TOPIK'))<>8
 OR (SELECT count(*) FROM content_speech_bindings s JOIN topik_owner_authored_curriculum_items q ON q.id=s.item_id
 WHERE q.source_asset_id='preview160-v3-2026-10-12-source' AND s.language='ko' AND s.provider='google-browser' AND s.binding_state='ready')<>8
 OR EXISTS(SELECT 1 FROM content_audio_bindings s JOIN content_quality_audits a ON a.content_id=s.item_id
 WHERE a.content_version IN ('preview160-v3-2026-10-12:N2','preview160-v3-2026-10-12:N1','preview160-v3-2026-10-12:TOPIK'));
 SELECT RAISE(ABORT,'V3 sealed content changed before visibility commit') WHERE (
 SELECT count(DISTINCT a.id) FROM content_release_quality_audit_links qa
 JOIN content_quality_audits a ON a.id=qa.audit_id AND a.learning_track=NEW.learning_track AND a.content_version=NEW.content_version
 LEFT JOIN jlpt_practice_questions q ON NEW.learning_track='jlpt-ja' AND q.id=a.content_id
 LEFT JOIN topik_owner_authored_curriculum_items t ON NEW.learning_track='topik-ko' AND t.id=a.content_id
 LEFT JOIN topik_owner_authored_curriculum_units u ON u.id=t.unit_id
 WHERE qa.release_id=NEW.id AND a.release_state='approved'
 AND (a.evidence_sha256=NEW.manifest_sha256 AND a.validator_version=NEW.parser_version AND a.automated_status='passed'
 AND a.author_review_status='signed' AND a.adversarial_review_status='signed')
 AND (a.author_reviewer='preview160-v3-review-a-2026-10-12'
 AND a.adversarial_reviewer='preview160-v3-independent-reviewer-b-2026-10-12'
 AND a.content_type=iif(NEW.learning_track='jlpt-ja','jlpt-quiz','topik-owner'))
 AND json_type(qa.expected_question_json,'$.row')='object'
 AND ((NEW.learning_track='jlpt-ja' AND q.bank_version=NEW.content_version AND q.is_published=0
 AND json_type(qa.expected_question_json,'$.unit')='null' AND json_type(qa.expected_question_json,'$.speech')='null'
 AND (q.id IS json_extract(qa.expected_question_json,'$.row.id')
 AND q.learning_track IS json_extract(qa.expected_question_json,'$.row.learning_track')
 AND q.level IS json_extract(qa.expected_question_json,'$.row.level')
 AND q.mode IS json_extract(qa.expected_question_json,'$.row.mode')
 AND q.skill IS json_extract(qa.expected_question_json,'$.row.skill')
 AND q.difficulty IS json_extract(qa.expected_question_json,'$.row.difficulty'))
 AND (q.prompt_ko IS json_extract(qa.expected_question_json,'$.row.prompt_ko')
 AND q.prompt_ja IS json_extract(qa.expected_question_json,'$.row.prompt_ja')
 AND q.prompt_en IS json_extract(qa.expected_question_json,'$.row.prompt_en')
 AND q.choices_json IS json_extract(qa.expected_question_json,'$.row.choices_json')
 AND q.answer_index IS json_extract(qa.expected_question_json,'$.row.answer_index')
 AND q.explanation_ko IS json_extract(qa.expected_question_json,'$.row.explanation_ko'))
 AND (q.explanation_ja IS json_extract(qa.expected_question_json,'$.row.explanation_ja')
 AND q.explanation_en IS json_extract(qa.expected_question_json,'$.row.explanation_en')
 AND q.audio_script_ja IS json_extract(qa.expected_question_json,'$.row.audio_script_ja')
 AND q.source_code IS json_extract(qa.expected_question_json,'$.row.source_code')
 AND q.source_evidence_sha256 IS json_extract(qa.expected_question_json,'$.row.source_evidence_sha256')
 AND q.bank_version IS json_extract(qa.expected_question_json,'$.row.bank_version'))
 AND (q.is_published IS json_extract(qa.expected_question_json,'$.row.is_published')))
 OR (NEW.learning_track='topik-ko' AND json_type(qa.expected_question_json,'$.unit')='object'
 AND (t.id IS json_extract(qa.expected_question_json,'$.row.id')
 AND t.unit_id IS json_extract(qa.expected_question_json,'$.row.unit_id')
 AND t.target_grade IS json_extract(qa.expected_question_json,'$.row.target_grade')
 AND t.stable_ref IS json_extract(qa.expected_question_json,'$.row.stable_ref')
 AND t.item_type IS json_extract(qa.expected_question_json,'$.row.item_type')
 AND t.prompt_ko IS json_extract(qa.expected_question_json,'$.row.prompt_ko'))
 AND (t.prompt_ja IS json_extract(qa.expected_question_json,'$.row.prompt_ja')
 AND t.prompt_en IS json_extract(qa.expected_question_json,'$.row.prompt_en')
 AND t.answer_json IS json_extract(qa.expected_question_json,'$.row.answer_json')
 AND t.explanation_ko IS json_extract(qa.expected_question_json,'$.row.explanation_ko')
 AND t.explanation_ja IS json_extract(qa.expected_question_json,'$.row.explanation_ja')
 AND t.explanation_en IS json_extract(qa.expected_question_json,'$.row.explanation_en'))
 AND (t.audio_required IS json_extract(qa.expected_question_json,'$.row.audio_required')
 AND t.source_asset_id IS json_extract(qa.expected_question_json,'$.row.source_asset_id')
 AND t.audio_text_ko IS json_extract(qa.expected_question_json,'$.row.audio_text_ko')) AND (u.id IS json_extract(qa.expected_question_json,'$.unit.id')
 AND u.target_grade IS json_extract(qa.expected_question_json,'$.unit.target_grade')
 AND u.stable_ref IS json_extract(qa.expected_question_json,'$.unit.stable_ref')
 AND u.section IS json_extract(qa.expected_question_json,'$.unit.section')
 AND u.title_ko IS json_extract(qa.expected_question_json,'$.unit.title_ko')
 AND u.title_ja IS json_extract(qa.expected_question_json,'$.unit.title_ja'))
 AND (u.title_en IS json_extract(qa.expected_question_json,'$.unit.title_en')
 AND u.source_asset_id IS json_extract(qa.expected_question_json,'$.unit.source_asset_id'))
 AND ((t.audio_required=0 AND json_type(qa.expected_question_json,'$.speech')='null' AND NOT EXISTS(SELECT 1 FROM content_speech_bindings s WHERE s.item_id=t.id))
 OR (t.audio_required=1 AND EXISTS(SELECT 1 FROM content_speech_bindings s JOIN learning_content_stable_refs stable ON stable.stable_ref=s.stable_ref
 WHERE s.item_id=t.id AND (stable.item_id=t.id AND stable.item_type=s.item_type AND stable.learning_track='topik-ko' AND stable.source_asset_id=t.source_asset_id AND stable.level_tag='grade-'||t.target_grade)
 AND (s.id IS json_extract(qa.expected_question_json,'$.speech.id')
 AND s.stable_ref IS json_extract(qa.expected_question_json,'$.speech.stable_ref')
 AND s.item_type IS json_extract(qa.expected_question_json,'$.speech.item_type')
 AND s.item_id IS json_extract(qa.expected_question_json,'$.speech.item_id')
 AND s.language IS json_extract(qa.expected_question_json,'$.speech.language')
 AND s.speech_role IS json_extract(qa.expected_question_json,'$.speech.speech_role'))
 AND (s.provider IS json_extract(qa.expected_question_json,'$.speech.provider')
 AND s.binding_state IS json_extract(qa.expected_question_json,'$.speech.binding_state')
 AND s.text_source IS json_extract(qa.expected_question_json,'$.speech.text_source')
 AND s.unavailable_reason IS json_extract(qa.expected_question_json,'$.speech.unavailable_reason')))))))
 )<>iif(NEW.learning_track='jlpt-ja',60,40);
END;
CREATE TRIGGER preview160_v3_publish_visibility AFTER UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') AND NEW.release_state='published'
BEGIN
 UPDATE content_quality_audits SET release_state='published' WHERE id IN (SELECT audit_id FROM content_release_quality_audit_links WHERE release_id=NEW.id);
 UPDATE jlpt_practice_questions SET is_published=1 WHERE NEW.learning_track='jlpt-ja' AND bank_version=NEW.content_version;
END;
CREATE TRIGGER preview160_v3_withdraw_visibility AFTER UPDATE OF release_state ON content_releases
WHEN NEW.id IN ('preview160-v3-n2-2026-10-12','preview160-v3-n1-2026-10-12','preview160-v3-topik-2026-10-12') AND NEW.release_state='withdrawn'
BEGIN
 UPDATE content_quality_audits SET release_state='withdrawn' WHERE id IN (SELECT audit_id FROM content_release_quality_audit_links WHERE release_id=NEW.id);
 UPDATE jlpt_practice_questions SET is_published=0 WHERE NEW.learning_track='jlpt-ja' AND bank_version=NEW.content_version;
END;
