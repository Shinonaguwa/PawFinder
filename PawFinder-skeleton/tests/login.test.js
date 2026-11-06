import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { startTestServer } from './helpers.js';

const SECRET = 'test-secret-that-is-long-enough';
const account = { name: 'Ana Reyes', email: 'ana@example.com', password: 'correct horse' };

async function setup(options = {}) {
  const server = await startTestServer({ jwtSecret: SECRET, ...options });
  await server.request('POST', '/api/auth/register', { body: account });
  return server;
}

test('logging in with the right password returns a token and the user', async () => {
  const { request, close } = await setup();
  try {
    const res = await request('POST', '/api/auth/login', {
      body: { email: account.email, password: account.password },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, account.email);
    assert.equal(JSON.stringify(res.body.user).includes('password'), false);

    const claims = jwt.verify(res.body.token, SECRET);
    assert.equal(claims.sub, String(res.body.user.id));
    assert.ok(claims.jti);
    assert.ok(claims.exp > claims.iat);
  } finally {
    close();
  }
});

test('email matching ignores letter case and surrounding spaces', async () => {
  const { request, close } = await setup();
  try {
    const res = await request('POST', '/api/auth/login', {
      body: { email: '  ANA@Example.com ', password: account.password },
    });
    assert.equal(res.status, 200);
  } finally {
    close();
  }
});

test('wrong password and unknown email give the same 401 message', async () => {
  const { request, close } = await setup();
  try {
    const wrongPassword = await request('POST', '/api/auth/login', {
      body: { email: account.email, password: 'not the password' },
    });
    const unknownEmail = await request('POST', '/api/auth/login', {
      body: { email: 'nobody@example.com', password: account.password },
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
    assert.equal(wrongPassword.body.token, undefined);
  } finally {
    close();
  }
});

test('missing or non-string credentials return 400', async () => {
  const { request, close } = await setup();
  try {
    for (const body of [{}, { email: account.email }, { password: 'x' }, { email: ['a@b.co'], password: { x: 1 } }]) {
      const res = await request('POST', '/api/auth/login', { body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  } finally {
    close();
  }
});

test('GET /api/auth/me returns the user for a valid token', async () => {
  const { request, close } = await setup();
  try {
    const login = await request('POST', '/api/auth/login', {
      body: { email: account.email, password: account.password },
    });
    const me = await request('GET', '/api/auth/me', { token: login.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, account.email);
  } finally {
    close();
  }
});

test('/me rejects missing, garbage, wrong-secret and expired tokens', async () => {
  const { request, db, close } = await setup();
  try {
    const userId = db.prepare('SELECT id FROM users').get().id;

    assert.equal((await request('GET', '/api/auth/me')).status, 401);
    assert.equal((await request('GET', '/api/auth/me', { token: 'garbage' })).status, 401);

    const wrongSecret = jwt.sign({ sub: String(userId) }, 'some-other-secret-value', { expiresIn: '1h' });
    assert.equal((await request('GET', '/api/auth/me', { token: wrongSecret })).status, 401);

    const expired = jwt.sign({ sub: String(userId) }, SECRET, { expiresIn: -10 });
    assert.equal((await request('GET', '/api/auth/me', { token: expired })).status, 401);

    // A token that claims no signature at all must not be accepted.
    const unsigned = jwt.sign({ sub: String(userId) }, '', { algorithm: 'none' });
    assert.equal((await request('GET', '/api/auth/me', { token: unsigned })).status, 401);
  } finally {
    close();
  }
});

test('a valid token for a deleted account is rejected', async () => {
  const { request, db, close } = await setup();
  try {
    const login = await request('POST', '/api/auth/login', {
      body: { email: account.email, password: account.password },
    });
    db.prepare('DELETE FROM users').run();
    assert.equal((await request('GET', '/api/auth/me', { token: login.body.token })).status, 401);
  } finally {
    close();
  }
});

test('tokens last for the configured number of hours', async () => {
  const { request, close } = await setup({ sessionHours: 2 });
  try {
    const login = await request('POST', '/api/auth/login', {
      body: { email: account.email, password: account.password },
    });
    const claims = jwt.verify(login.body.token, SECRET);
    assert.equal(claims.exp - claims.iat, 2 * 3600);
  } finally {
    close();
  }
});
