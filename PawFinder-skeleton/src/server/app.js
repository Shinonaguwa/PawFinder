import express from 'express';

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

  // Feature routes plug in here, for example:
  //   app.use('/api/auth', authRoutes(db));      // AUTH-01, AUTH-02
  //   app.use('/api/reports', reportRoutes(db)); // REP-01 ... REP-04

  // Anything else under /api is a 404 in JSON form.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
