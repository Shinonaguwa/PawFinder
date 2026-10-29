import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server/app.js';
import { openDatabase } from '../src/server/db.js';

function addUser(db, email = 'owner@example.com') {
  return db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run('Test Owner', email, 'not-a-real-hash').lastInsertRowid;
}

function addReport(db, authorId, overrides = {}) {
  const r = {
    status: 'Lost',
    species: 'Dog',
    description: 'Brown dog with a red collar',
    latitude: 10.3157,
    longitude: 123.8854,
    ...overrides,
  };
  return db
    .prepare(
      `INSERT INTO reports (author_id, status, species, description, latitude, longitude)
       VALUES (@authorId, @status, @species, @description, @latitude, @longitude)`,
    )
    .run({ authorId, ...r });
}

test('schema creates users, reports and report_photos tables', () => {
  const db = openDatabase();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables.sort(), ['report_photos', 'reports', 'users']);
});

test('a valid report can be saved and read back with its location', () => {
  const db = openDatabase();
  const id = addReport(db, addUser(db)).lastInsertRowid;
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  assert.equal(report.status, 'Lost');
  assert.equal(report.latitude, 10.3157);
  assert.equal(report.longitude, 123.8854);
  assert.equal(report.resolved, 0);
});

test('duplicate emails are rejected', () => {
  const db = openDatabase();
  addUser(db, 'same@example.com');
  assert.throws(() => addUser(db, 'same@example.com'), /UNIQUE/);
});

test('report status must be Lost, Found or Sighting', () => {
  const db = openDatabase();
  const userId = addUser(db);
  assert.throws(() => addReport(db, userId, { status: 'Missing' }), /CHECK/);
});

test('latitude and longitude must be valid coordinates', () => {
  const db = openDatabase();
  const userId = addUser(db);
  assert.throws(() => addReport(db, userId, { latitude: 123 }), /CHECK/);
  assert.throws(() => addReport(db, userId, { longitude: -200 }), /CHECK/);
});

test('a report cannot reference a user that does not exist', () => {
  const db = openDatabase();
  assert.throws(() => addReport(db, 9999), /FOREIGN KEY/);
});

test('GET /api/health reports the API and database are up', async () => {
  const db = openDatabase();
  addReport(db, addUser(db));
  const server = createApp(db).listen(0);
  await once(server, 'listening');
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.deepEqual(body.database, { users: 1, reports: 1 });
  } finally {
    server.close();
  }
});

test('unknown /api routes return a JSON 404', async () => {
  const server = createApp(openDatabase()).listen(0);
  await once(server, 'listening');
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found' });
  } finally {
    server.close();
  }
});
