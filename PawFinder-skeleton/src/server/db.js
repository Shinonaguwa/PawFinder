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
  return db;
}
