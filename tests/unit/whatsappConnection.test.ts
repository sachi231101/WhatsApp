import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @/lib/db
const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  sql: (...args: any[]) => mockSql(...args),
}));

import { whatsappConnectionService } from '@/lib/services/whatsapp/connectionService';
import { encrypt } from '@/lib/crypto/encryption';

describe('WhatsAppConnectionService (STEP 7: Multi-Tenant Connection)', () => {
  const ws1 = '00000000-0000-0000-0000-000000000001';
  const ws2 = '00000000-0000-0000-0000-000000000002';
  const wabaId = '109283746501928';
  const phoneId = '209384756102938';
  const testToken = 'EAAG_test_meta_access_token_12345';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectWaba', () => {
    it('encrypts access token with AES-256-GCM and inserts account + phone number', async () => {
      // 1. Return inserted account ID
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'acc-uuid-1' }],
      });
      // 2. Return inserted phone number ID
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'phone-uuid-1' }],
      });

      const result = await whatsappConnectionService.connectWaba({
        workspaceId: ws1,
        wabaId,
        businessId: 'biz-123',
        name: 'My Store WhatsApp',
        accessToken: testToken,
        phoneNumberId: phoneId,
        displayPhoneNumber: '+1 555 123 4567',
        isCallingEnabled: true,
      });

      expect(result.accountId).toBe('acc-uuid-1');
      expect(result.phoneId).toBe('phone-uuid-1');
      expect(mockSql).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWorkspaceConnections', () => {
    it('returns accounts and associated phones without leaking raw or encrypted tokens', async () => {
      mockSql.mockImplementation(async (strings: any) => {
        const query = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (query.includes('FROM whatsapp_accounts')) {
          return {
            rows: [
              {
                id: 'acc-uuid-1',
                workspace_id: ws1,
                waba_id: wabaId,
                business_id: 'biz-123',
                name: 'My Store WhatsApp',
                status: 'connected',
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-02'),
              },
            ],
          };
        }
        if (query.includes('FROM whatsapp_phone_numbers')) {
          return {
            rows: [
              {
                id: 'phone-uuid-1',
                whatsapp_account_id: 'acc-uuid-1',
                phone_number_id: phoneId,
                display_phone_number: '+1 555 123 4567',
                verified_name: 'My Store',
                quality_rating: 'GREEN',
                status: 'verified',
                is_calling_enabled: true,
                created_at: new Date('2026-01-01'),
              },
            ],
          };
        }
        return { rows: [] };
      });

      const connections = await whatsappConnectionService.getWorkspaceConnections(ws1);

      expect(connections).toHaveLength(1);
      expect(connections[0].wabaId).toBe(wabaId);
      expect(connections[0].phoneNumbers).toHaveLength(1);
      expect(connections[0].phoneNumbers[0].phoneNumberId).toBe(phoneId);
      expect(connections[0].phoneNumbers[0].isCallingEnabled).toBe(true);

      // Verify strict token secrecy
      const acc = connections[0] as any;
      expect(acc.encrypted_access_token).toBeUndefined();
      expect(acc.token_iv).toBeUndefined();
      expect(acc.token_tag).toBeUndefined();
      expect(acc.accessToken).toBeUndefined();
    });

    it('returns empty array when workspace has no connected WABAs', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });
      const connections = await whatsappConnectionService.getWorkspaceConnections(ws2);
      expect(connections).toEqual([]);
    });
  });

  describe('getDecryptedTokenForWaba', () => {
    it('decrypts and returns the plaintext access token for matching workspace', async () => {
      const encrypted = encrypt(testToken);

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            encrypted_access_token: encrypted.ciphertext,
            token_iv: encrypted.iv,
            token_tag: encrypted.tag,
            status: 'connected',
          },
        ],
      });

      const decrypted = await whatsappConnectionService.getDecryptedTokenForWaba(ws1, wabaId);
      expect(decrypted).toBe(testToken);
    });

    it('throws error when WABA is not found in the specified workspace', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      await expect(
        whatsappConnectionService.getDecryptedTokenForWaba(ws2, wabaId),
      ).rejects.toThrow('No WhatsApp account found');
    });

    it('throws error if the account is disconnected', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ status: 'disconnected', encrypted_access_token: 'abc', token_iv: 'def', token_tag: '123' }],
      });

      await expect(
        whatsappConnectionService.getDecryptedTokenForWaba(ws1, wabaId),
      ).rejects.toThrow('WhatsApp account for WABA 109283746501928 is disconnected');
    });
  });

  describe('disconnectWaba', () => {
    it('marks the account as disconnected', async () => {
      mockSql.mockResolvedValueOnce({ rowCount: 1 });

      const success = await whatsappConnectionService.disconnectWaba(ws1, wabaId);
      expect(success).toBe(true);
      expect(mockSql).toHaveBeenCalledTimes(1);
    });
  });
});
