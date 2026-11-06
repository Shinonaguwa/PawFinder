import { Router } from 'express';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { requireAuth } from '../lib/auth.js';
import { signToken } from '../lib/tokens.js';
import { hashResetToken, newResetToken } from '../lib/resetTokens.js';
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
 *   POST /logout     AUTH-03  end the session: the token stops working immediately
 *   POST /forgot-password   AUTH-04  email a one-time reset link
 *   POST /reset-password    AUTH-04  set a new password using that link's token
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

  router.post('/logout', requireAuth(db, config), (req, res, next) => {
    try {
      const { jti, exp } = req.auth;
      db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)').run(jti, exp);
      // Tidy up: revoked tokens that have expired anyway no longer need a row.
      db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  const INVALID_RESET = 'This reset link is invalid or has expired. Request a new one.';

  router.post('/forgot-password', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!email) return res.status(400).json({ error: 'Enter your email address.' });

      // Same answer whether or not the account exists, so this cannot be used to find out who has one.
      const reply = { message: 'If an account exists for that email, a reset link has been sent.' };

      const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
      if (!user) return res.json(reply);

      const now = Math.floor(Date.now() / 1000);
      const { token, hash } = newResetToken();
      db.transaction(() => {
        // Only the newest link works.
        db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now, user.id);
        db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
          user.id,
          hash,
          now + config.resetMinutes * 60,
        );
      })();

      try {
        await config.sendMail({
          to: user.email,
          subject: 'Reset your PawFinder password',
          text:
            `Someone asked to reset the password for your PawFinder account.\n\n` +
            `Open this link to choose a new password (it works once and expires in ${config.resetMinutes} minutes):\n` +
            `${config.appUrl}/?reset=${token}\n\n` +
            `If you did not ask for this, you can ignore this email. Your password has not changed.`,
        });
      } catch (err) {
        // Do not tell the caller: a failure here would reveal that the account exists.
        console.error('Could not send password reset email:', err);
      }
      return res.json(reply);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/reset-password', async (req, res, next) => {
    try {
      const { token, password } = req.body ?? {};
      if (typeof token !== 'string' || token.length === 0) return res.status(400).json({ error: INVALID_RESET });

      const passwordError = checkPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError, fields: { password: passwordError } });

      const now = Math.floor(Date.now() / 1000);
      const reset = db
        .prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?')
        .get(hashResetToken(token));
      if (!reset || reset.used_at !== null || reset.expires_at < now) {
        return res.status(400).json({ error: INVALID_RESET });
      }

      const passwordHash = await hashPassword(password);
      const applied = db.transaction(() => {
        // Claim the link first; if two requests race, only one gets changes === 1.
        const claimed = db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL').run(now, reset.id);
        if (claimed.changes !== 1) return false;
        db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now, reset.user_id);
        // Bumping token_version ends every session that was started with the old password.
        db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(
          passwordHash,
          reset.user_id,
        );
        return true;
      })();
      if (!applied) return res.status(400).json({ error: INVALID_RESET });

      return res.json({ message: 'Your password has been changed. Log in with your new password.' });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
