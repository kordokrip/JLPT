-- 강성호 · 2026-09-25: 기존 세션/학습 이력을 보존하며 빠른 학습과 보상 원장을 추가한다.
ALTER TABLE study_sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'daily' CHECK(mode IN ('daily','quick'));

CREATE TABLE study_reward_events (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 learning_track TEXT NOT NULL CHECK(learning_track IN ('jlpt-ja','topik-ko')),
 source_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('learn','review','practice','retry')),
 study_day TEXT NOT NULL,
 timezone TEXT NOT NULL,
 points INTEGER NOT NULL CHECK(points BETWEEN 0 AND 5),
 occurred_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,learning_track,source_id)
);
CREATE INDEX study_reward_events_day ON study_reward_events(user_id,learning_track,study_day);
-- 동일 D1 batch 안에서 지급액을 계산하고 기록한다. 우회 쓰기도 일일 상한을 넘지 않는다.
CREATE TRIGGER study_reward_daily_cap
AFTER INSERT ON study_reward_events
BEGIN
 UPDATE study_reward_events SET points=min(NEW.points,max(0,100-COALESCE((SELECT SUM(points) FROM study_reward_events
 WHERE user_id=NEW.user_id AND learning_track=NEW.learning_track AND study_day=NEW.study_day AND source_id<>NEW.source_id),0)))
 WHERE user_id=NEW.user_id AND learning_track=NEW.learning_track AND source_id=NEW.source_id;
END;
