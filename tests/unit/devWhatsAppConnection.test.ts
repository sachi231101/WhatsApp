import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSql, sqlMockObj } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] as any[] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });
  return { mockSql: mockFn, sqlMockObj: obj };
});

vi.mock('@/lib/db', () => ({ sql: sqlMockObj }));
vi.mock('@vercel/postgres', () => ({ sql: sqlMockObj }));

vi.mock('@/lib/crypto/encryption', () => ({
  encrypt: (v: string) => ({ ciphertext: `enc:${v}`, iv: 'iv', tag: 'tag' }),
  decrypt: ({ ciphertext }: { ciphertext: string }) =>
    ciphertext.startsWith('enc:') ? ciphertext.slice(4) : ciphertext,
}));

vi.mock('@/app/api/mockData', () => ({
  isMockMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/app/api/beUtils', () => ({
  getToken: vi.fn(),
  subscribeWebhook: vi.fn().mockResolvedValue(undefined),
}));

const mockMetaGraphGet = vi.fn();
vi.mock('@/lib/meta/graphClient', () => ({
  metaGraphClient: {
    get: (...args: any[]) => mockMetaGraphGet(...args),
    post: vi.fn(),
    delete: vi.fn(),
  },
  MetaGraphApiException: class MetaGraphApiException extends Error {
    code: number;
    constructor(error: any) {
      super(error.message || 'Meta Graph API Error');
      this.code = error.code || 500;
    }
  },
}));

vi.mock('@/app/privateConfig', () => ({
  default: vi.fn().mockResolvedValue({
    whatsappAccessToken: 'dev_token_abc',
    whatsappPhoneNumberId: 'phone_123',
    whatsappBusinessAccountId: 'waba_456',
  }),
}));

vi.mock('@/lib/whatsapp/devConfig', () => ({
  isWhatsAppDevConfigAvailable: vi.fn().mockReturnValue(true),
}));

import {
  projectConnectionService,
  DevWhatsAppConnectionError,
} from '@/lib/services/whatsapp/projectConnectionService';
import { MetaGraphApiException } from '@/lib/meta/graphClient';
import { subscribeWebhook } from '@/app/api/beUtils';

describe('connectFromDevelopmentConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(async () => ({ rows: [] as any[], rowCount: 0 }));
  });

  it('rejects when phone is already CONNECTED to another workspace', async () => {
    mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
      const q = strings.join(' ');
      if (q.includes('workspace_id !=') && q.includes('CONNECTED')) {
        return { rows: [{ workspace_id: 'other-ws', project_id: 'other-proj' }] as any[] };
      }
      return { rows: [] as any[] };
    });

    await expect(
      projectConnectionService.connectFromDevelopmentConfig({
        projectId: 'proj-1',
        workspaceId: 'ws-1',
      }),
    ).rejects.toMatchObject({
      reasonCode: 'PHONE_IN_USE',
      statusCode: 409,
    });
  });

  it('maps invalid token Meta errors to INVALID_CREDENTIALS', async () => {
    mockSql.mockImplementation(async () => ({ rows: [] as any[] }));
    mockMetaGraphGet.mockRejectedValue(
      new MetaGraphApiException({ message: 'Invalid OAuth', code: 190, type: 'OAuthException' }),
    );

    try {
      await projectConnectionService.connectFromDevelopmentConfig({
        projectId: 'proj-1',
        workspaceId: 'ws-1',
      });
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(DevWhatsAppConnectionError);
      expect(e.reasonCode).toBe('INVALID_CREDENTIALS');
    }
  });

  it('persists CONNECTED connection with connectionSource=development', async () => {
    const connRow = {
      id: 'conn-1',
      workspace_id: 'ws-1',
      project_id: 'proj-1',
      waba_id: 'waba_456',
      phone_number_id: 'phone_123',
      display_phone_number: '+91 90000 00000',
      verified_name: 'Dev Biz',
      business_name: 'Dev Biz',
      status: 'CONNECTED',
      metadata: { connectionSource: 'development' },
      created_at: new Date(),
      updated_at: new Date(),
      last_verified_at: new Date(),
      disconnected_at: null as Date | null,
    };

    mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
      const q = strings.join(' ');
      if (q.includes('workspace_id !=')) return { rows: [] as any[] };
      if (q.includes('INSERT INTO whatsapp_connections')) return { rows: [connRow] as any[] };
      if (q.includes('INSERT INTO whatsapp_accounts')) return { rows: [{ id: 'acc-1' }] as any[] };
      if (q.includes('INSERT INTO whatsapp_phone_numbers')) return { rows: [{ id: 'ph-1' }] as any[] };
      return { rows: [] as any[] };
    });

    mockMetaGraphGet
      .mockResolvedValueOnce({ id: 'waba_456', name: 'Dev Biz' })
      .mockResolvedValueOnce({
        id: 'phone_123',
        display_phone_number: '+91 90000 00000',
        verified_name: 'Dev Biz',
      });

    const result = await projectConnectionService.connectFromDevelopmentConfig({
      projectId: 'proj-1',
      workspaceId: 'ws-1',
    });

    expect(result.status).toBe('CONNECTED');
    expect(result.wabaId).toBe('waba_456');
    expect(result.phoneNumberId).toBe('phone_123');
    expect(result.metadata.connectionSource).toBe('development');
    expect(subscribeWebhook).toHaveBeenCalled();
  });

  it('checkConnectionHealth returns reasonCode DISCONNECTED when no connection', async () => {
    mockSql.mockImplementation(async () => ({ rows: [] as any[] }));
    const health = await projectConnectionService.checkConnectionHealth('missing-proj');
    expect(health.healthy).toBe(false);
    expect(health.reasonCode).toBe('DISCONNECTED');
  });
});
