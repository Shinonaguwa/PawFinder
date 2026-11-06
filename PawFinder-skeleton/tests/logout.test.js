import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

const SECRET = 'test-secret-that-is-long-enough';
const account = { name: 'Ana Reyes', email: 'ana@example.com', password: 'correct horse' };

async function setup() {
  const server = await startTestServer({ jwtSecret: SECRET });
  await server.request('POST', '/api/auth/register', { body: account });
  const login = () =>
    server.request('POST', '/api/auth/login', { body: { email: account.email, password: account.password } });
  return { ...server, login };
}

test('logging out makes the token stop working straight away', async () => {
  const { request, login, close } = await setup();
  try {
    const { token } = (await login()).body;
    assert.equal((await request('GET', '/api/auth/me', { token })).status, 200);

    const out = await request('POST', '/api/auth/logout', { token });
    assert.equal(out.status, 204);

    assert.equal((await request('GET', '/api/auth/me', { token })).status, 401);
    // Logging out twice with the same token is also rejected (it is already dead).
    assert.equal((await request('POST', '/api/auth/logout', { token })).status, 401);
  } finally {
    close();
  }
});

test('logging out one session leaves the same user\'s other sessions working', async () => {
  const { request, login, close } = await setup();
  try {
    const phone = (await login()).body.token;
    const laptop = (await login()).body.token;
    assert.notEqual(phone, laptop);

    await request('POST', '/api/auth/logout', { token: phone });
    assert.equal((await request('GET', '/api/auth/me', { token: phone })).status, 401);
    assert.equal((await request('GET', '/api/auth/me', { token: laptop })).status, 200);
  } finally {
    close();
  }
});

test('the user can log in again after logging out', async () => {
  const { request, login, close } = await setup();
  try {
    const first = (await login()).body.token;
    await request('POST', '/api/auth/logout', { token: first });
    const second = await login();
    assert.equal(second.status, 200);
    assert.equal((await request('GET', '/api/auth/me', { token: second.body.token })).status, 200);
  } finally {
    close();
  }
});

test('logout without a valid token returns 401 and revokes nothing', async () => {
  const { request, db, close } = await setup();
  try {
    assert.equal((await request('POST', '/api/auth/logout')).status, 401);
    assert.equal((await request('POST', '/api/auth/logout', { token: 'garbage' })).status, 401);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM revoked_tokens').get().n, 0);
  } finally {
    close();
  }
});

test('revoked tokens that have already expired are cleaned up on the next logout', async () => {
  const { request, login, db, close } = await setup();
  try {
    db.prepare('INSERT INTO revoked_tokens (jti, expires_at) VALUES (?, ?)').run('old-token', 1);
    const { token } = (await login()).body;
    await request('POST', '/api/auth/logout', { token });
    const rows = db.prepare('SELECT jti FROM revoked_tokens').all();
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].jti, 'old-token');
  } finally {
    close();
  }
});
