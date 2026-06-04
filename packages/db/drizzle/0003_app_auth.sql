-- App-managed authentication and session audit tables.

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password' CHECK (auth_provider IN ('password', 'google', 'cf-access'));
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN last_login_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uk
  ON users(google_sub)
  WHERE google_sub IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

UPDATE users
SET role = 'admin'
WHERE id = 'owner' OR email = 'owner@nihongo-n3.local';

CREATE TABLE IF NOT EXISTS auth_sessions (
  id          TEXT PRIMARY KEY NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at  INTEGER,
  user_agent  TEXT,
  ip          TEXT
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT,
  provider    TEXT NOT NULL CHECK (provider IN ('password', 'google', 'cf-access')),
  event_type  TEXT NOT NULL CHECK (event_type IN ('login_success', 'login_failed', 'logout', 'register', 'google_start', 'google_callback')),
  ip          TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS login_events_user_idx ON login_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events(created_at);
