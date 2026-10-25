-- 강성호 2026-10-13: INC-QUIZ-098. 퀴즈 snapshot을 보존하고 철회/채점 경쟁을 DB에서 원자적으로 차단한다.
-- 테이블/기존 행/정답/학습 기록은 변경하지 않는다. NULL snapshot의 완료된 과거 집계는 보존한다.
CREATE TRIGGER quiz_attempts_no_replace
BEFORE INSERT ON quiz_attempts
WHEN EXISTS(SELECT 1 FROM quiz_attempts WHERE id=NEW.id)
BEGIN
 SELECT RAISE(ABORT,'Quiz snapshot immutable');
END;
--> statement-breakpoint
CREATE TRIGGER quiz_attempts_snapshot_immutable
BEFORE UPDATE OF id,user_id,learning_track,quiz_type,mode,level,total,questions_json ON quiz_attempts
WHEN NEW.id IS NOT OLD.id OR NEW.user_id IS NOT OLD.user_id OR NEW.learning_track IS NOT OLD.learning_track
 OR NEW.quiz_type IS NOT OLD.quiz_type OR NEW.mode IS NOT OLD.mode OR NEW.level IS NOT OLD.level
 OR NEW.total IS NOT OLD.total OR NEW.questions_json IS NOT OLD.questions_json
BEGIN
 SELECT RAISE(ABORT,'Quiz snapshot immutable');
END;
--> statement-breakpoint
CREATE TRIGGER quiz_attempts_finished_immutable
BEFORE UPDATE OF finished_at,correct,detail_json ON quiz_attempts
WHEN OLD.finished_at IS NOT NULL AND (NEW.finished_at IS NOT OLD.finished_at
 OR NEW.correct IS NOT OLD.correct OR NEW.detail_json IS NOT OLD.detail_json)
BEGIN
 SELECT RAISE(ABORT,'Quiz finished result immutable');
END;
--> statement-breakpoint
CREATE TRIGGER quiz_attempts_publication_insert
BEFORE INSERT ON quiz_attempts
WHEN NEW.questions_json IS NOT NULL OR NEW.finished_at IS NULL
BEGIN
 SELECT RAISE(ABORT,'Quiz snapshot invalid') WHERE NEW.questions_json IS NULL
 OR NOT json_valid(NEW.questions_json)
 OR json_type(IIF(json_valid(NEW.questions_json),NEW.questions_json,'[]')) IS NOT 'array'
 OR NEW.learning_track IS NOT 'jlpt-ja' OR NEW.level IS NULL OR NEW.level NOT IN ('N5','N4','N3','N2','N1')
 OR NEW.mode IS NULL OR NEW.mode NOT IN ('vocab_mc','grammar_fill','kanji_reading','listening')
 OR NEW.total<1 OR NEW.total>20
 OR json_array_length(IIF(json_valid(NEW.questions_json),NEW.questions_json,'[]'))<>NEW.total;
 SELECT RAISE(ABORT,'Quiz snapshot invalid') WHERE EXISTS(
 SELECT 1 FROM json_each(NEW.questions_json) q WHERE q.type IS NOT 'object'
 OR json_type(IIF(q.type='object',q.value,'{}'),'$.id') IS NOT 'text'
 OR length(trim(json_extract(IIF(q.type='object',q.value,'{}'),'$.id')))=0
 OR json_type(IIF(q.type='object',q.value,'{}'),'$.answer') IS NOT 'text'
 OR length(trim(json_extract(IIF(q.type='object',q.value,'{}'),'$.answer')))=0
 OR json_extract(IIF(q.type='object',q.value,'{}'),'$.type') IS NOT NEW.mode
 OR COALESCE(json_type(IIF(q.type='object',q.value,'{}'),'$.item_id'),'missing') NOT IN ('text','integer')
 OR (json_type(IIF(q.type='object',q.value,'{}'),'$.item_id')='integer'
  AND (json_extract(q.value,'$.item_id')<1 OR json_extract(q.value,'$.item_id')>9007199254740991))
 OR (json_type(IIF(q.type='object',q.value,'{}'),'$.item_id')='text' AND length(trim(json_extract(q.value,'$.item_id')))=0)
 OR (json_type(IIF(q.type='object',q.value,'{}'),'$.bank_version') IS NOT NULL
  AND (json_type(IIF(q.type='object',q.value,'{}'),'$.item_id') IS NOT 'text'
   OR json_type(IIF(q.type='object',q.value,'{}'),'$.bank_version') IS NOT 'text'
   OR length(trim(json_extract(IIF(q.type='object',q.value,'{}'),'$.bank_version')))=0)));
 SELECT RAISE(ABORT,'Quiz snapshot invalid') WHERE
 (SELECT count(DISTINCT json_extract(q.value,'$.id')) FROM json_each(NEW.questions_json) q)<>NEW.total;
 SELECT RAISE(ABORT,'Quiz content unavailable') WHERE EXISTS(
 SELECT 1 FROM json_each(NEW.questions_json) q WHERE json_type(q.value,'$.item_id')='text' AND NOT EXISTS(
 SELECT 1 FROM jlpt_practice_questions bank WHERE bank.id=json_extract(q.value,'$.item_id')
 AND bank.learning_track=NEW.learning_track AND bank.level=NEW.level AND bank.mode=NEW.mode
 AND bank.mode=json_extract(q.value,'$.type') AND bank.is_published=1
 AND (json_type(q.value,'$.bank_version') IS NULL OR bank.bank_version IS json_extract(q.value,'$.bank_version'))));
END;
--> statement-breakpoint
CREATE TRIGGER quiz_attempts_publication_grade
BEFORE UPDATE OF finished_at,correct,detail_json ON quiz_attempts
WHEN NEW.finished_at IS NOT OLD.finished_at OR NEW.correct IS NOT OLD.correct OR NEW.detail_json IS NOT OLD.detail_json
BEGIN
 SELECT RAISE(ABORT,'Quiz snapshot invalid') WHERE NEW.questions_json IS NULL
 OR NOT json_valid(NEW.questions_json)
 OR json_type(IIF(json_valid(NEW.questions_json),NEW.questions_json,'[]')) IS NOT 'array'
 OR NEW.learning_track IS NOT 'jlpt-ja' OR NEW.level IS NULL OR NEW.level NOT IN ('N5','N4','N3','N2','N1')
 OR NEW.mode IS NULL OR NEW.mode NOT IN ('vocab_mc','grammar_fill','kanji_reading','listening')
 OR NEW.total<1 OR NEW.total>20
 OR json_array_length(IIF(json_valid(NEW.questions_json),NEW.questions_json,'[]'))<>NEW.total;
 SELECT RAISE(ABORT,'Quiz snapshot invalid') WHERE EXISTS(
 SELECT 1 FROM json_each(NEW.questions_json) q WHERE q.type IS NOT 'object'
 OR json_type(IIF(q.type='object',q.value,'{}'),'$.id') IS NOT 'text'
 OR length(trim(json_extract(IIF(q.type='object',q.value,'{}'),'$.id')))=0
 OR json_type(IIF(q.type='object',q.value,'{}'),'$.answer') IS NOT 'text'
 OR length(trim(json_extract(IIF(q.type='object',q.value,'{}'),'$.answer')))=0
 OR json_extract(IIF(q.type='object',q.value,'{}'),'$.type') IS NOT NEW.mode
 OR COALESCE(json_type(IIF(q.type='object',q.value,'{}'),'$.item_id'),'missing') NOT IN ('text','integer')
 OR (json_type(IIF(q.type='object',q.value,'{}'),'$.item_id')='integer'
  AND (json_extract(q.value,'$.item_id')<1 OR json_extract(q.value,'$.item_id')>9007199254740991))
 OR (json_type(IIF(q.type='object',q.value,'{}'),'$.item_id')='text' AND length(trim(json_extract(q.value,'$.item_id')))=0)
 OR (json_type(IIF(q.type='object',q.value,'{}'),'$.bank_version') IS NOT NULL
  AND (json_type(IIF(q.type='object',q.value,'{}'),'$.item_id') IS NOT 'text'
   OR json_type(IIF(q.type='object',q.value,'{}'),'$.bank_version') IS NOT 'text'
   OR length(trim(json_extract(IIF(q.type='object',q.value,'{}'),'$.bank_version')))=0)));
 SELECT RAISE(ABORT,'Quiz snapshot invalid') WHERE
 (SELECT count(DISTINCT json_extract(q.value,'$.id')) FROM json_each(NEW.questions_json) q)<>NEW.total;
 SELECT RAISE(ABORT,'Quiz content unavailable') WHERE EXISTS(
 SELECT 1 FROM json_each(NEW.questions_json) q WHERE json_type(q.value,'$.item_id')='text' AND NOT EXISTS(
 SELECT 1 FROM jlpt_practice_questions bank WHERE bank.id=json_extract(q.value,'$.item_id')
 AND bank.learning_track=NEW.learning_track AND bank.level=NEW.level AND bank.mode=NEW.mode
 AND bank.mode=json_extract(q.value,'$.type') AND bank.is_published=1
 AND (json_type(q.value,'$.bank_version') IS NULL OR bank.bank_version IS json_extract(q.value,'$.bank_version'))));
END;
