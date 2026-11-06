import { createHash, randomBytes } from 'node:crypto';

/** A new random reset token (sent to the user) and its hash (stored in the database). */
export function newResetToken() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashResetToken(token) };
}

export function hashResetToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}
