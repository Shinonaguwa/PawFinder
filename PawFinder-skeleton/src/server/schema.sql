-- PawFinder database schema (SQLite)
-- Applied automatically by db.js every time the app starts. Safe to re-run.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,          -- never store plain passwords (AUTH-01)
  phone         TEXT,                      -- private: never returned to other users
  photo_url     TEXT,
  token_version INTEGER NOT NULL DEFAULT 0, -- bumped on password reset to end all existing sessions
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT    NOT NULL CHECK (status IN ('Lost', 'Found', 'Sighting')),
  species     TEXT    NOT NULL,
  breed       TEXT,
  color       TEXT,
  size        TEXT,
  markings    TEXT,
  description TEXT    NOT NULL,
  latitude    REAL    NOT NULL CHECK (latitude  BETWEEN  -90 AND  90),
  longitude   REAL    NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  resolved    INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report_photos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  url       TEXT    NOT NULL
);

-- Session tokens that were logged out before they expired (AUTH-03).
-- Rows can be deleted once expires_at has passed: the token is invalid by then anyway.
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti        TEXT    PRIMARY KEY,
  expires_at INTEGER NOT NULL              -- Unix time in seconds, copied from the token's exp claim
);

-- One-time password reset links (AUTH-04). Only a hash of the token is stored,
-- so a leaked database cannot be used to reset anyone's password.
CREATE TABLE IF NOT EXISTS password_resets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,             -- Unix time in seconds
  used_at    INTEGER,                      -- set once the link has been used
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_author   ON reports(author_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status, resolved);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_created  ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_report    ON report_photos(report_id);
