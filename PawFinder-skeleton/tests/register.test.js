import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { startTestServer } from './helpers.js';

const valid = { name: 'Ana Reyes', email: 'ana@example.com', password: 'correct horse' };

test('registering creates an account and never returns the password', async () => {
  const { request, db, close } = await startTestServer();
  try {
    const res = await request('POST', '/api/auth/register', { body: valid });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'ana@example.com');
    assert.equal(res.body.user.name, 'Ana Reyes');
    assert.ok(res.body.user.id);
    assert.equal(JSON.stringify(res.body).includes('password'), false);
    assert.equal(JSON.stringify(res.body).includes(valid.password), false);

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get('ana@example.com');
    assert.notEqual(row.password_hash, valid.password);
    assert.ok(await bcrypt.compare(valid.password, row.password_hash));
  } finally {
    close();
  }
});

test('email is trimmed and lower-cased, so duplicates are caught regardless of case', async () => {
  const { request, close } = await startTestServer();
  try {
    const first = await request('POST', '/api/auth/register', {
      body: { ...valid, email: '  Ana@Example.COM ' },
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.user.email, 'ana@example.com');

    const second = await request('POST', '/api/auth/register', { body: valid });
    assert.equal(second.status, 409);
    assert.ok(second.body.fields.email);
  } finally {
    close();
  }
});

test('missing or invalid fields are rejected with per-field messages', async () => {
  const { request, db, close } = await startTestServer();
  try {
    const empty = await request('POST', '/api/auth/register', { body: {} });
    assert.equal(empty.status, 400);
    assert.deepEqual(Object.keys(empty.body.fields).sort(), ['email', 'name', 'password']);

    const badEmail = await request('POST', '/api/auth/register', { body: { ...valid, email: 'nope' } });
    assert.equal(badEmail.status, 400);
    assert.ok(badEmail.body.fields.email);

    const shortPassword = await request('POST', '/api/auth/register', {
      body: { ...valid, password: 'short' },
    });
    assert.equal(shortPassword.status, 400);
    assert.ok(shortPassword.body.fields.password);

    const nonString = await request('POST', '/api/auth/register', {
      body: { name: 123, email: ['a@b.co'], password: { x: 1 } },
    });
    assert.equal(nonString.status, 400);

    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  } finally {
    close();
  }
});

test('malformed JSON returns a JSON 400', async () => {
  const { close, request } = await startTestServer();
  try {
    const res = await request('POST', '/api/auth/register', { raw: '{not json' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  } finally {
    close();
  }
});
