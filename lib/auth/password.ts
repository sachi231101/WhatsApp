import crypto from 'crypto';

/**
 * Hash a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Stored format: `${salt}:${derivedKeyHex}`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plaintext password against the stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  try {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}
