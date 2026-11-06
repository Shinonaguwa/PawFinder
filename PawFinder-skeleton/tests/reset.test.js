import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

const SECRET = 'test-secret-that-is-long-enough';
const account = { name: 'Ana Reyes', email: 'ana@example.com', password: 'correct horse' };
const NEW_PASSWORD = 'brand new password';

async function setup(options = {}) {
  const mails = [];
  const server = await startTestServer({
    jwtSecret: SECRET,
    appUrl: 'http://app.test/',
    sendMail: (mail) => mails.push(mail),
    ...options,
  });
  await server.request('POST', '/api/auth/register', { body: account });

  const login = (password = account.password, email = account.email) =>
    server.request('POST', '/api/auth/login', { body: { email, password } });
  const forgot = (email = account.email) => server.request('POST', '/api/auth/forgot-password', { body: { email } });
  const reset = (token, password = NEW_PASSWORD) =>
    server.request('POST', '/api/auth/reset-password', { body: { token, password } });
  // Pull the token out of the most recent email.
  const lastToken = () => mails.at(-1).text.match(/\/\?reset=([0-9a-f]+)/)[1];

  return { ...server, mails, login, forgot, reset, lastToken };
}

test('asking for a reset emails a one-time link to the account owner', async () => {
  const { forgot, mails, db, close } = await setup();
  try {
    const res = await forgot();
    assert.equal(res.status, 200);
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, account.email);
    assert.match(mails[0].text, /^.*http:\/\/app\.test\/\?reset=[0-9a-f]{64}/ms);

    // The database holds only a hash, never the token itself.
    const token = mails[0].text.match(/reset=([0-9a-f]+)/)[1];
    const row = db.prepare('SELECT * FROM password_resets').get();
    assert.notEqual(row.token_hash, token);
    assert.equal(JSON.stringify(res.body).includes(token), false);
  } finally {
    close();
  }
});

test('unknown emails get the same answer and no email is sent', async () => {
  const { forgot, mails, db, close } = await setup();
  try {
    const known = await forgot();
    const unknown = await forgot('nobody@example.com');
    assert.equal(unknown.status, 200);
    assert.deepEqual(unknown.body, known.body);
    assert.equal(mails.length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n, 1);
  } finally {
    close();
  }
});

test('a missing email is a 400, and email sending failures are not revealed', async () => {
  const { request, forgot, close } = await setup({
    sendMail: () => {
      throw new Error('smtp down');
    },
  });
  try {
    assert.equal((await request('POST', '/api/auth/forgot-password', { body: {} })).status, 400);
    const res = await forgot();
    assert.equal(res.status, 200);
  } finally {
    close();
  }
});

test('the link sets a new password: the old one stops working and the new one works', async () => {
  const { forgot, reset, login, lastToken, close } = await setup();
  try {
    await forgot();
    const res = await reset(lastToken());
    assert.equal(res.status, 200);

    assert.equal((await login(account.password)).status, 401);
    assert.equal((await login(NEW_PASSWORD)).status, 200);
  } finally {
    close();
  }
});

test('a reset link works only once', async () => {
  const { forgot, reset, login, lastToken, close } = await setup();
  try {
    await forgot();
    const token = lastToken();
    assert.equal((await reset(token)).status, 200);
    assert.equal((await reset(token, 'another password!')).status, 400);
    assert.equal((await login(NEW_PASSWORD)).status, 200);
  } finally {
    close();
  }
});

test('only the newest link works after asking twice', async () => {
  const { forgot, reset, lastToken, close } = await setup();
  try {
    await forgot();
    const first = lastToken();
    await forgot();
    const second = lastToken();
    assert.notEqual(first, second);
    assert.equal((await reset(first)).status, 400);
    assert.equal((await reset(second)).status, 200);
  } finally {
    close();
  }
});

test('expired, unknown and malformed tokens are rejected the same way', async () => {
  const { forgot, reset, lastToken, db, close } = await setup();
  try {
    await forgot();
    const token = lastToken();
    db.prepare('UPDATE password_resets SET expires_at = 1').run();

    const expired = await reset(token);
    const unknown = await reset('0'.repeat(64));
    const garbage = await reset('not a token');
    const missing = await reset(undefined);
    for (const res of [expired, unknown, garbage, missing]) assert.equal(res.status, 400);
    assert.deepEqual(expired.body, unknown.body);
  } finally {
    close();
  }
});

test('a weak new password is refused and the link stays usable', async () => {
  const { forgot, reset, lastToken, login, close } = await setup();
  try {
    await forgot();
    const token = lastToken();
    const weak = await reset(token, 'short');
    assert.equal(weak.status, 400);
    assert.ok(weak.body.fields.password);
    assert.equal((await login(account.password)).status, 200);

    assert.equal((await reset(token)).status, 200);
  } finally {
    close();
  }
});

test('resetting the password logs out every existing session', async () => {
  const { request, forgot, reset, login, lastToken, close } = await setup();
  try {
    const oldSession = (await login()).body.token;
    assert.equal((await request('GET', '/api/auth/me', { token: oldSession })).status, 200);

    await forgot();
    await reset(lastToken());

    assert.equal((await request('GET', '/api/auth/me', { token: oldSession })).status, 401);
    const fresh = (await login(NEW_PASSWORD)).body.token;
    assert.equal((await request('GET', '/api/auth/me', { token: fresh })).status, 200);
  } finally {
    close();
  }
});

test('an older database without token_version is upgraded on open', async () => {
  const { default: Database } = await import('better-sqlite3');
  const { openDatabase } = await import('../src/server/db.js');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const file = join(mkdtempSync(join(tmpdir(), 'pawfinder-')), 'old.db');
  const old = new Database(file);
  old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, phone TEXT, photo_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO users (name, email, password_hash) VALUES ('Old', 'old@example.com', 'x');`);
  old.close();

  const db = openDatabase(file);
  assert.equal(db.prepare('SELECT token_version FROM users').get().token_version, 0);
  db.close();
});
