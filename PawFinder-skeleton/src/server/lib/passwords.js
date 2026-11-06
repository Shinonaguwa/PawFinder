import bcrypt from 'bcryptjs';

// Cost factor for bcrypt. Tests lower it through BCRYPT_ROUNDS to stay fast.
const rounds = () => Number(process.env.BCRYPT_ROUNDS) || 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, rounds());
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
