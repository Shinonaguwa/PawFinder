import { once } from 'node:events';
import { createApp } from '../src/server/app.js';
import { openDatabase } from '../src/server/db.js';

// Keep bcrypt fast in tests. Must be set before the app modules are used.
process.env.BCRYPT_ROUNDS = '4';

/** Start the app on a random port with a throwaway database. */
export async function startTestServer(options = {}) {
  const db = openDatabase();
  const server = createApp(db, options).listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  // `body` is sent as JSON; `raw` is sent as-is (for malformed-input tests).
  async function request(method, path, { body, raw, token } = {}) {
    const headers = {};
    if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + path, {
      method,
      headers,
      body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return { db, request, close: () => server.close() };
}
