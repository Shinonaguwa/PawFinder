import { Router } from 'express';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { requireAuth } from '../lib/auth.js';
import { signToken } from '../lib/tokens.js';
import { checkEmail, checkName, checkPassword, normalizeEmail } from '../lib/validation.js';

/** The fields of a user row that are safe to send to the browser. */
export function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

/**
 * Authentication routes, mounted at /api/auth.
 *   POST /register   AUTH-01  create an account
 *   POST /login      AUTH-02  exchange email + password for a session token
 *   GET  /me         AUTH-02  the logged-in user (used to restore a session)
 */
export function authRoutes(db, config) {
  const router = Router();

  // Compared against when the email is unknown, so a missing account takes
  // about as long to reject as a wrong password (no account-existence leak).
  let decoyHash;
  const getDecoyHash = () => (decoyHash ??= hashPassword('decoy-password-for-timing'));

  router.post('/register', async (req, res, next) => {
    try {
      const { name, password } = req.body ?? {};
      const email = normalizeEmail(req.body?.email);

      const errors = {};
      const nameError = checkName(name);
      const emailError = checkEmail(email);
      const passwordError = checkPassword(password);
      if (nameError) errors.name = nameError;
      if (emailError) errors.email = emailError;
      if (passwordError) errors.password = passwordError;
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res
          .status(409)
          .json({ error: 'An account with this email already exists.', fields: { email: 'Already registered.' } });
      }

      const passwordHash = await hashPassword(password);
      let id;
      try {
        id = db
          .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
          .run(name.trim(), email, passwordHash).lastInsertRowid;
      } catch (err) {
        // Two sign-ups with the same email can race past the check above.
        if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
          return res
            .status(409)
            .json({ error: 'An account with this email already exists.', fields: { email: 'Already registered.' } });
        }
        throw err;
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      return res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;
      if (!email || typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ error: 'Enter your email and password.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      const ok = await verifyPassword(password, user ? user.password_hash : await getDecoyHash());
      if (!user || !ok) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
      }

      return res.json({ token: signToken(user, config), user: publicUser(user) });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/me', requireAuth(db, config), (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  return router;
}
