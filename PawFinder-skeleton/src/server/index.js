import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

// Read settings from the .env file in the repository root (see .env.example).
dotenv.config({ path: resolve(repoRoot, '.env') });

const port = Number(process.env.APP_PORT) || 3000;
const dbPath = resolve(repoRoot, process.env.DATABASE_PATH || 'data/pawfinder.db');

const db = openDatabase(dbPath);
const app = createApp(db);

app.listen(port, () => {
  console.log(`PawFinder API running at http://localhost:${port}`);
  console.log(`Database: ${dbPath}`);
});
