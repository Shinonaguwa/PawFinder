import express from 'express';
import { authRoutes } from './routes/auth.js';

/**
 * Build the Express app. The database is passed in so tests can use an
 * in-memory database instead of the real file.
 */
export function createApp(db) {
  const app = express();
  app.use(express.json());

  // Health check: confirms the API is up and the database is readable.
  app.get('/api/health', (_req, res) => {
    const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get();
    const { reports } = db.prepare('SELECT COUNT(*) AS reports FROM reports').get();
    res.json({
      status: 'ok',
      service: 'pawfinder-api',
      database: { users, reports },
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes(db)); // AUTH-01, AUTH-02
  // More feature routes plug in here, for example:
  //   app.use('/api/reports', reportRoutes(db)); // REP-01 ... REP-04

  // Anything else under /api is a 404 in JSON form.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Errors are returned as JSON too, without leaking internals.
  // eslint-disable-next-line no-unused-vars
  app.use('/api', (err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}
