import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
dotenv.config({ path: resolve(repoRoot, '.env') });

const dbPath = resolve(repoRoot, process.env.DATABASE_PATH || 'data/pawfinder.db');
const db = openDatabase(dbPath);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);

console.log(`Database ready at ${dbPath}`);
console.log(`Tables: ${tables.join(', ')}`);
db.close();
