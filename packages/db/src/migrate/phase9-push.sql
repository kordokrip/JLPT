-- Phase 9: Web Push 구독 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT    NOT NULL UNIQUE,
  p256dh      TEXT    NOT NULL,
  auth        TEXT    NOT NULL,
  user_agent  TEXT,
  morning_on  INTEGER NOT NULL DEFAULT 1,  -- 아침 복습 알림
  evening_on  INTEGER NOT NULL DEFAULT 1,  -- 취침 전 알림
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
