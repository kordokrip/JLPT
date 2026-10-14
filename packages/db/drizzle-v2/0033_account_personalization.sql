-- 강성호 2026-10-14: 학습 원장을 변경하지 않는 계정 설정/사진/알림 확장.
CREATE TABLE account_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT CHECK(theme IN ('light','dark','system')),
  accent TEXT CHECK(accent IN ('track','forest','sea','ink')),
  reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK(reminder_enabled IN (0,1)),
  reminder_time TEXT NOT NULL DEFAULT '19:00' CHECK(length(reminder_time)=5 AND reminder_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(reminder_time,1,2) <= '23' AND substr(reminder_time,4,2) IN ('00','15','30','45')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  custom_reminder_configured INTEGER NOT NULL DEFAULT 0 CHECK(custom_reminder_configured IN (0,1)),
  google_picture_url TEXT,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE account_avatars (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  jpeg BLOB NOT NULL CHECK(typeof(jpeg)='blob' AND length(jpeg) BETWEEN 1 AND 131072),
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE custom_reminder_deliveries (
  endpoint TEXT NOT NULL,
  local_date TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('claimed','sent')),
  claimed_at INTEGER NOT NULL,
  sent_at INTEGER,
  PRIMARY KEY(endpoint,local_date)
);
