import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
export const TAG_LENGTH = 16; // 128 bits

function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.AUTH0_SECRET ||
    process.env.FB_APP_SECRET ||
    'fallback-insecure-default-key-32b!';
  // Hash the secret with SHA-256 to ensure exactly 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  ciphertext: string; // Hex
  iv: string; // Hex
  tag: string; // Hex
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload
 */
export function decrypt(payload: EncryptedPayload): string {
  const key = getMasterKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(tag);
  let plaintext = decipher.update(payload.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Serialize an encrypted payload into a compact single-string format:
 * `v1:iv:tag:ciphertext`
 */
export function serializeEncrypted(payload: EncryptedPayload): string {
  return `v1:${payload.iv}:${payload.tag}:${payload.ciphertext}`;
}

/**
 * Deserialize and decrypt a compact `v1:iv:tag:ciphertext` string
 */
export function deserializeAndDecrypt(serialized: string): string {
  if (!serialized.startsWith('v1:')) {
    // If not encrypted (e.g. legacy plain token), return as-is for backward compatibility
    return serialized;
  }
  const parts = serialized.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted string format');
  }
  return decrypt({
    iv: parts[1],
    tag: parts[2],
    ciphertext: parts[3],
  });
}
