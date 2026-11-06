import { verifyToken } from './tokens.js';

/**
 * Express middleware that requires a valid "Authorization: Bearer <token>" header.
 * On success it sets req.user (the database row) and req.auth (the token claims).
 */
export function requireAuth(db, config) {
  return (req, res, next) => {
    try {
      const header = req.get('Authorization') || '';
      const [scheme, token] = header.split(' ');
      const claims = scheme === 'Bearer' && token ? verifyToken(token, config) : null;
      const user = claims ? db.prepare('SELECT * FROM users WHERE id = ?').get(Number(claims.sub)) : null;
      if (!user) return res.status(401).json({ error: 'Please log in.' });
      req.user = user;
      req.auth = claims;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
