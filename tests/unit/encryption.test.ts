import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  serializeEncrypted,
  deserializeAndDecrypt,
} from '@/lib/crypto/encryption';

describe('Encryption Utility (AES-256-GCM)', () => {
  it('encrypts and decrypts a Meta access token accurately', () => {
    const originalToken = 'EAAG1234567890abcdef_real_meta_access_token_XYZ';
    const encrypted = encrypt(originalToken);

    expect(encrypted.ciphertext).not.toBe(originalToken);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes in hex = 24 chars
    expect(encrypted.tag).toHaveLength(32); // 16 bytes in hex = 32 chars

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('serializes and deserializes compact strings accurately', () => {
    const secretMessage = 'EAAG999988887777';
    const encrypted = encrypt(secretMessage);
    const serialized = serializeEncrypted(encrypted);

    expect(serialized.startsWith('v1:')).toBe(true);

    const recovered = deserializeAndDecrypt(serialized);
    expect(recovered).toBe(secretMessage);
  });

  it('preserves legacy unencrypted strings gracefully for backward compatibility', () => {
    const legacyPlainToken = 'legacy_plaintext_meta_token_12345';
    const recovered = deserializeAndDecrypt(legacyPlainToken);
    expect(recovered).toBe(legacyPlainToken);
  });

  it('fails decryption if ciphertext is tampered with', () => {
    const originalToken = 'tamper_test_token';
    const encrypted = encrypt(originalToken);

    // Tamper with last character of ciphertext
    const tamperedHex =
      encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.endsWith('00') ? 'ff' : '00');
    const tamperedPayload = { ...encrypted, ciphertext: tamperedHex };

    expect(() => decrypt(tamperedPayload)).toThrow();
  });
});
