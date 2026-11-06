import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Open (and create, if needed) the SQLite database and apply schema.sql.
 * Pass ':memory:' (the default) for a throwaway database, e.g. in tests.
 */
export function openDatabase(path = ':memory:') {
  if (path !== ':memory:') {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }
  const db = new Database(path);
  if (path !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(resolve(here, 'schema.sql'), 'utf8'));
  migrate(db);
  return db;
}

/**
 * CREATE TABLE IF NOT EXISTS cannot add columns to a table that already exists,
 * so databases created by older versions get new columns added here.
 */
function migrate(db) {
  const userColumns = db.prepare("SELECT name FROM pragma_table_info('users')").all().map((c) => c.name);
  if (!userColumns.includes('token_version')) {
    db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
  }
}
