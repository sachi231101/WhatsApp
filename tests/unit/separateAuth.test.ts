import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';

describe('Separated Authentication & Role Security', () => {
  describe('Password Hashing & Verification', () => {
    it('hashes passwords with unique cryptographic salts', () => {
      const password = 'SecretPassword123!';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(password);
      expect(hash1).not.toBe(hash2); // Different salts
      expect(hash1).toContain(':');
    });

    it('successfully verifies correct password', () => {
      const password = 'Admin@SecurePass2026';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('rejects incorrect password', () => {
      const password = 'Client@SecurePass2026';
      const hash = hashPassword(password);

      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('handles invalid or empty hashes gracefully', () => {
      expect(verifyPassword('any', null)).toBe(false);
      expect(verifyPassword('any', undefined)).toBe(false);
      expect(verifyPassword('any', 'invalid-format-no-salt')).toBe(false);
    });
  });

  describe('Session Token & Role Isolation', () => {
    it('creates and verifies an encrypted Client session token', () => {
      const clientUser = {
        userId: 'client-uuid-123',
        email: 'client@company.com',
        name: 'Client User',
        role: 'client' as const,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        workspaceId: 'workspace-123',
        companyName: 'Acme Global',
      };

      const token = createSessionToken(clientUser);
      expect(typeof token).toBe('string');
      expect(token.startsWith('v1:')).toBe(true);

      const verified = verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.email).toBe('client@company.com');
      expect(verified?.role).toBe('client');
      expect(verified?.isSuperAdmin).toBe(false);
      expect(verified?.companyName).toBe('Acme Global');
    });

    it('creates and verifies an encrypted Admin session token', () => {
      const adminUser = {
        userId: 'admin-uuid-999',
        email: 'admin@wazzapp.com',
        name: 'Platform Admin',
        role: 'admin' as const,
        isSuperAdmin: true,
        tenantId: 'tenant-admin',
        workspaceId: 'workspace-admin',
      };

      const token = createSessionToken(adminUser);
      const verified = verifySessionToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.email).toBe('admin@wazzapp.com');
      expect(verified?.role).toBe('admin');
      expect(verified?.isSuperAdmin).toBe(true);
    });

    it('rejects expired or tampered session tokens', () => {
      // Expired token (maxAge: -10 seconds)
      const token = createSessionToken(
        {
          userId: 'test',
          email: 'test@example.com',
          name: 'Test',
          role: 'client',
          isSuperAdmin: false,
        },
        -10,
      );

      const verified = verifySessionToken(token);
      expect(verified).toBeNull();

      // Tampered token
      expect(verifySessionToken('v1:invalid:tampered:token')).toBeNull();
      expect(verifySessionToken('')).toBeNull();
    });
  });
});
