// Small input checks shared by the auth routes. Each returns an error message
// string, or null when the value is acceptable.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt only uses the first 72 bytes

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function checkName(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return 'Name is required.';
  if (value.trim().length > 100) return 'Name must be 100 characters or fewer.';
  return null;
}

export function checkEmail(email) {
  if (!email) return 'Email is required.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

export function checkPassword(value) {
  if (typeof value !== 'string' || value.length === 0) return 'Password is required.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} bytes.`;
  }
  return null;
}
