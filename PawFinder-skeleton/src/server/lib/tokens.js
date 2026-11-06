import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const ALGORITHM = 'HS256';

function requireSecret(config) {
  if (!config.jwtSecret) throw new Error('JWT_SECRET is not set.');
  return config.jwtSecret;
}

/** Create a signed session token for a user. Each token has a unique id (jti). */
export function signToken(user, config) {
  return jwt.sign({ sub: String(user.id) }, requireSecret(config), {
    algorithm: ALGORITHM,
    expiresIn: `${config.sessionHours}h`,
    jwtid: randomUUID(),
  });
}

/** Check a token's signature and expiry. Returns its claims, or null if it is not valid. */
export function verifyToken(token, config) {
  try {
    return jwt.verify(token, requireSecret(config), { algorithms: [ALGORITHM] });
  } catch (err) {
    if (err.message === 'JWT_SECRET is not set.') throw err;
    return null;
  }
}
