-- Additive learning UX only. No source/bank/FSRS rows are replaced or published.
CREATE TABLE learning_profiles (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 learning_track TEXT NOT NULL CHECK(learning_track IN ('jlpt-ja','topik-ko')),
 target_level TEXT NOT NULL,
 instruction_language TEXT NOT NULL CHECK(instruction_language IN ('ko','ja','en')),
 daily_minutes INTEGER NOT NULL DEFAULT 20 CHECK(daily_minutes IN (10,20,30)),
 timezone TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,learning_track),
 CHECK((learning_track='jlpt-ja' AND target_level IN ('N5','N4','N3','N2','N1'))
 OR (learning_track='topik-ko' AND target_level IN ('1','2','3','4','5','6')))
);
CREATE TABLE study_sessions (
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 learning_track TEXT NOT NULL CHECK(learning_track IN ('jlpt-ja','topik-ko')),
 level TEXT NOT NULL, daily_minutes INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','abandoned')),
 request_id TEXT NOT NULL, notices_json TEXT NOT NULL DEFAULT '[]',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(user_id,learning_track,request_id)
);
CREATE UNIQUE INDEX study_sessions_one_open ON study_sessions(user_id,learning_track) WHERE status IN ('active','paused');
CREATE INDEX study_sessions_history ON study_sessions(user_id,learning_track,created_at);
CREATE TABLE study_steps (
 id TEXT PRIMARY KEY NOT NULL,
 session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('review','learn','practice','retry')),
 content_ref TEXT NOT NULL, content_type TEXT NOT NULL, content_id TEXT NOT NULL,
 section TEXT NOT NULL, level TEXT NOT NULL,
 public_json TEXT NOT NULL CHECK(json_valid(public_json)),
 solution_json TEXT NOT NULL CHECK(json_valid(solution_json)),
 card_id INTEGER,
 revealed INTEGER NOT NULL DEFAULT 0 CHECK(revealed IN (0,1)),
 request_id TEXT, answer TEXT, rating TEXT CHECK(rating IN ('again','hard','good','easy')),
 correct INTEGER CHECK(correct IN (0,1)),
 active_ms INTEGER NOT NULL DEFAULT 0 CHECK(active_ms BETWEEN 0 AND 1800000),
 submitted_at INTEGER,
 UNIQUE(session_id,ordinal)
);
-- A D1 batch first claims the step, then writes progress/FSRS/activity.
-- Racing/replayed claims abort the whole batch, not only its later statements.
CREATE TRIGGER study_steps_single_submission
BEFORE UPDATE OF request_id ON study_steps
WHEN OLD.request_id IS NOT NULL
BEGIN
 SELECT RAISE(ABORT, 'study step already submitted');
END;
-- A stale request must not claim a step after another device closes its session.
-- The exception aborts progress/card/activity writes in the same D1 batch.
CREATE TRIGGER study_steps_open_session_claim
BEFORE UPDATE OF request_id ON study_steps
WHEN NEW.request_id IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM study_sessions WHERE id=NEW.session_id AND status IN ('active','paused')
)
BEGIN
 SELECT RAISE(ABORT, 'study session is closed');
END;
CREATE TABLE learning_annotations (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 learning_track TEXT NOT NULL CHECK(learning_track IN ('jlpt-ja','topik-ko')),
 scope TEXT NOT NULL CHECK(scope IN ('content','day')),
 ref TEXT NOT NULL, text TEXT NOT NULL CHECK(length(text)<=1000),
 revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,learning_track,scope,ref)
);
CREATE TABLE content_learning_links (
 learning_track TEXT NOT NULL CHECK(learning_track IN ('jlpt-ja','topik-ko')),
 question_ref TEXT NOT NULL, concept_ref TEXT NOT NULL,
 evidence_sha256 TEXT NOT NULL CHECK(length(evidence_sha256)=64),
 reviewer_a TEXT NOT NULL, reviewer_b TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(learning_track,question_ref,concept_ref),
 CHECK(length(reviewer_a)>0 AND length(reviewer_b)>0 AND reviewer_a<>reviewer_b)
);
